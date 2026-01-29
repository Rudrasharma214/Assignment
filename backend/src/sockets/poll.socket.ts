import { Server, Socket } from "socket.io";
import { PollService } from "../services/poll.service";
import { VoteService } from "../services/vote.service";
import { isDBConnected } from "../config/database";

let activeTeacherSocketId: string | null = null;
let teacherDisconnectTimer: NodeJS.Timeout | null = null;
let lastTeacherPollId: string | null = null;

const rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

function transformPoll(poll: any) {
  if (!poll) return null;
  return {
    id: poll._id.toString(),
    question: poll.question,
    options: poll.options.map((opt: any) => ({
      id: opt._id.toString(),
      text: opt.text
    })),
    duration: poll.duration,
    startedAt: new Date(poll.startedAt).getTime(),
    status: poll.status
  };
}

function checkRateLimit(socketId: string, maxRequests: number = 20, windowMs: number = 1000): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(socketId);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(socketId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}

function withDBCheck(socket: Socket, handler: () => Promise<void>) {
  return async () => {
    if (!isDBConnected()) {
      socket.emit("error", { message: "Service temporarily unavailable. Please try again." });
      return;
    }
    await handler();
  };
}

export const registerPollSocket = (io: Server) => {

  const onPollEnded = (pollId: string, results: Record<string, number>) => {
    io.to(pollId).emit("poll_ended", {
      pollId,
      results
    });
  };

  io.on("connection", (socket: Socket) => {

    console.log("Socket connected:", socket.id);

    socket.on("join_student", async ({ studentSessionId, studentName }) => {
      try {
        if (!studentName || !studentName.trim()) {
          socket.emit("error", { message: "Student name is required" });
          return;
        }

        const trimmedName = studentName.trim();

        if (PollService.isStudentNameTaken(trimmedName, socket.id)) {
          socket.emit("error", { message: "This name is already taken. Please choose a different name." });
          return;
        }

        if (socket.data.studentSessionId) {
          PollService.removeConnectedStudent(socket.id);
        }

        socket.data.studentSessionId = studentSessionId;
        socket.data.studentName = trimmedName;
        socket.data.role = "student";

        const state = await PollService.handleStudentJoin(studentSessionId, trimmedName, socket.id);

        if (state.poll) {
          socket.join(state.poll._id.toString());
          socket.emit("poll_state", {
            poll: transformPoll(state.poll),
            remainingTime: state.remainingTime,
            results: state.results,
            hasVoted: state.hasVoted
          });
        } else {
          socket.emit("poll_state", {
            poll: null,
            remainingTime: 0,
            results: {},
            hasVoted: false
          });
        }
      } catch (error: any) {
        console.error("Error in join_student:", error);
        socket.emit("error", { message: error.message || "Failed to join" });
      }
    });

    socket.on("join_teacher", async () => {
      try {
        if (activeTeacherSocketId && activeTeacherSocketId !== socket.id) {
          const previousSocket = io.sockets.sockets.get(activeTeacherSocketId);
          if (previousSocket?.connected) {
            socket.emit("error", { message: "Another teacher is already connected" });
            socket.disconnect(true);
            return;
          }
        }

        if (teacherDisconnectTimer) {
          clearTimeout(teacherDisconnectTimer);
          teacherDisconnectTimer = null;
        }

        const isRefresh = lastTeacherPollId !== null;
        activeTeacherSocketId = socket.id;
        socket.data.role = "teacher";

        const state = await PollService.handleTeacherJoin(isRefresh);

        if (state.poll) {
          socket.join(state.poll._id.toString());
          lastTeacherPollId = state.poll._id.toString();
        } else {
          lastTeacherPollId = null;
        }

        socket.emit("poll_state", {
          poll: transformPoll(state.poll),
          remainingTime: state.remainingTime,
          results: state.results,
          hasVoted: false,
          studentCount: state.studentCount,
          voteCount: state.voteCount
        });
      } catch (error: any) {
        console.error("Error in join_teacher:", error);
        socket.emit("error", { message: error.message || "Failed to join as teacher" });
      }
    });

    socket.on("create_poll", async (data) => {
      try {
        if (socket.data.role !== "teacher") {
          socket.emit("error", { message: "Only teachers can create polls" });
          return;
        }

        const poll = await PollService.createPoll(data, onPollEnded);

        socket.join(poll._id.toString());
        lastTeacherPollId = poll._id.toString();

        const transformedPoll = transformPoll(poll);
        io.emit("poll_started", {
          poll: transformedPoll,
          remainingTime: poll.duration,
          results: {}
        });

        const sockets = await io.fetchSockets();
        for (const s of sockets) {
          if (s.data.role === "student") {
            s.join(poll._id.toString());
          }
        }
      } catch (error: any) {
        console.error("Error in create_poll:", error);
        socket.emit("error", { message: error.message || "Failed to create poll" });
      }
    });

    socket.on("submit_vote", async ({ pollId, optionId }) => {
      try {
        if (!checkRateLimit(socket.id, 5, 1000)) {
          socket.emit("error", { message: "Too many requests. Please slow down." });
          return;
        }

        if (!PollService.validatePollId(pollId)) {
          socket.emit("error", { message: "Invalid poll ID" });
          return;
        }

        const studentSessionId = socket.data.studentSessionId;
        const studentName = socket.data.studentName || "Anonymous";

        if (!studentSessionId) {
          socket.emit("error", { message: "Student session not identified" });
          return;
        }

        const voteResult = await VoteService.submitVote(
          pollId,
          studentSessionId,
          studentName,
          optionId
        );

        const studentCount = PollService.getConnectedStudentCount();

        io.to(pollId).emit("vote_update", {
          pollId,
          results: voteResult.results,
          voteCount: voteResult.voteCount,
          studentCount
        });

        if (voteResult.voteCount >= studentCount && studentCount > 0) {
          io.to(pollId).emit("all_students_voted", { pollId });
        }
      } catch (error: any) {
        console.error("Error in submit_vote:", error);
        socket.emit("error", { message: error.message || "Failed to submit vote" });
      }
    });

    socket.on("request_poll_state", async () => {
      try {
        const state = await PollService.handleRequestPollState(socket.data.studentSessionId);

        if (state.poll) {
          socket.join(state.poll._id.toString());
        }

        socket.emit("poll_state", {
          poll: transformPoll(state.poll),
          remainingTime: state.remainingTime,
          results: state.results,
          hasVoted: state.hasVoted
        });
      } catch (error: any) {
        console.error("Error in request_poll_state:", error);
        socket.emit("error", { message: error.message || "Failed to get poll state" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      if (socket.data.role === "teacher" && activeTeacherSocketId === socket.id) {
        teacherDisconnectTimer = setTimeout(() => {
          activeTeacherSocketId = null;
          lastTeacherPollId = null;
          teacherDisconnectTimer = null;
        }, 5000);
      }

      if (socket.data.role === "student") {
        PollService.removeConnectedStudent(socket.id);
      }

      rateLimitMap.delete(socket.id);
    });
  });

};

