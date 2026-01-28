import { Server, Socket } from "socket.io";
import { PollService } from "../services/poll.service";
import { VoteService } from "../services/vote.service";
import { isDBConnected } from "../config/database";

let activeTeacherSocketId: string | null = null;

const activeStudentNames: Map<string, string> = new Map();

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

function isStudentNameTaken(name: string, excludeSocketId?: string): boolean {
  for (const [socketId, studentName] of activeStudentNames.entries()) {
    if (studentName.toLowerCase() === name.toLowerCase() && socketId !== excludeSocketId) {
      return true;
    }
  }
  return false;
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

        if (isStudentNameTaken(trimmedName, socket.id)) {
          socket.emit("error", { message: "This name is already taken. Please choose a different name." });
          return;
        }

        if (socket.data.studentSessionId) {
          PollService.removeConnectedStudent(socket.id);
          activeStudentNames.delete(socket.id);
        }

        socket.data.studentSessionId = studentSessionId;
        socket.data.studentName = trimmedName;
        socket.data.role = "student";

        PollService.addConnectedStudent(socket.id, studentSessionId, trimmedName);
        activeStudentNames.set(socket.id, trimmedName);

        const activePoll = await PollService.getActivePoll();

        if (activePoll) {
          const remaining = PollService.calculateRemainingTime(activePoll);
          const results = await PollService.getResults(activePoll._id.toString());
          const hasVoted = await VoteService.hasVoted(
            activePoll._id.toString(),
            studentSessionId
          );

          socket.join(activePoll._id.toString());

          socket.emit("poll_state", {
            poll: transformPoll(activePoll),
            remainingTime: remaining,
            results,
            hasVoted
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
            return;
          }
          activeTeacherSocketId = null;
        }

        activeTeacherSocketId = socket.id;
        socket.data.role = "teacher";

        const activePoll = await PollService.getActivePoll();

        if (activePoll) {
          const remaining = PollService.calculateRemainingTime(activePoll);
          const results = await PollService.getResults(activePoll._id.toString());
          const voteCount = await VoteService.getVoteCount(activePoll._id.toString());

          socket.join(activePoll._id.toString());

          socket.emit("poll_state", {
            poll: transformPoll(activePoll),
            remainingTime: remaining,
            results,
            hasVoted: false,
            studentCount: PollService.getConnectedStudentCount(),
            voteCount
          });
        } else {
          socket.emit("poll_state", {
            poll: null,
            remainingTime: 0,
            results: {},
            hasVoted: false,
            studentCount: PollService.getConnectedStudentCount(),
            voteCount: 0
          });
        }
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
        const studentSessionId = socket.data.studentSessionId;
        const studentName = socket.data.studentName || "Anonymous";

        if (!studentSessionId) {
          socket.emit("error", { message: "Student session not identified" });
          return;
        }

        const results = await VoteService.submitVote(
          pollId,
          studentSessionId,
          studentName,
          optionId
        );

        const voteCount = await VoteService.getVoteCount(pollId);
        const studentCount = PollService.getConnectedStudentCount();

        io.to(pollId).emit("vote_update", {
          pollId,
          results,
          voteCount,
          studentCount
        });

        if (voteCount >= studentCount && studentCount > 0) {
          io.to(pollId).emit("all_students_voted", { pollId });
        }
      } catch (error: any) {
        console.error("Error in submit_vote:", error);
        socket.emit("error", { message: error.message || "Failed to submit vote" });
      }
    });

    socket.on("request_poll_state", async () => {
      try {
        const activePoll = await PollService.getActivePoll();

        if (activePoll) {
          const remaining = PollService.calculateRemainingTime(activePoll);
          const results = await PollService.getResults(activePoll._id.toString());
          const hasVoted = socket.data.studentSessionId
            ? await VoteService.hasVoted(activePoll._id.toString(), socket.data.studentSessionId)
            : false;

          socket.join(activePoll._id.toString());

          socket.emit("poll_state", {
            poll: transformPoll(activePoll),
            remainingTime: remaining,
            results,
            hasVoted
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
        console.error("Error in request_poll_state:", error);
        socket.emit("error", { message: error.message || "Failed to get poll state" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      if (socket.data.role === "teacher" && activeTeacherSocketId === socket.id) {
        activeTeacherSocketId = null;
      }

      if (socket.data.role === "student") {
        PollService.removeConnectedStudent(socket.id);
        activeStudentNames.delete(socket.id);
      }
    });
  });

};

