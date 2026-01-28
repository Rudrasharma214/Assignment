import { Server, Socket } from "socket.io";
import { PollService } from "../services/poll.service";
import { VoteService } from "../services/vote.service";

let activeTeacherSocketId: string | null = null;

export const registerPollSocket = (io: Server) => {

  io.on("connection", (socket: Socket) => {

    console.log("Socket connected:", socket.id);

    socket.on("join_student", async ({ studentSessionId }) => {
      socket.data.studentSessionId = studentSessionId;
      socket.data.role = "student";

      const activePoll = await PollService.getActivePoll();

      if (activePoll) {
        const remaining = PollService.calculateRemainingTime(activePoll);

        socket.join(activePoll._id.toString());

        socket.emit("poll_state", {
          poll: activePoll,
          remainingTime: remaining
        });
      }
    });

    socket.on("join_teacher", async () => {
      if (activeTeacherSocketId && activeTeacherSocketId !== socket.id) {
        socket.emit("error", "Another teacher is already connected");
        return;
      }

      activeTeacherSocketId = socket.id;
      socket.data.role = "teacher";

      const activePoll = await PollService.getActivePoll();

      if (activePoll) {
        const remaining = PollService.calculateRemainingTime(activePoll);

        socket.join(activePoll._id.toString());

        socket.emit("poll_state", {
          poll: activePoll,
          remainingTime: remaining
        });
      }
    });

    socket.on("create_poll", async (data) => {
      try {
        if (socket.data.role !== "teacher") {
          socket.emit("error", "Only teachers can create polls");
          return;
        }

        const onPollEnded = (pollId: string, results: Record<string, number>) => {
          io.to(pollId).emit("poll_ended", {
            pollId,
            results
          });
        };

        const poll = await PollService.createPoll(data, onPollEnded);

        socket.join(poll._id.toString());

        io.to(poll._id.toString()).emit("poll_started", {
          poll,
          remainingTime: poll.duration
        });
      } catch (error: any) {
        socket.emit("error", error.message);
      }
    });

    socket.on("submit_vote", async ({ pollId, optionId }) => {
      try {
        const studentSessionId = socket.data.studentSessionId;

        if (!studentSessionId) {
          socket.emit("error", "Student session not identified");
          return;
        }

        const results = await VoteService.submitVote(
          pollId,
          studentSessionId,
          optionId
        );

        io.to(pollId).emit("vote_update", {
          pollId,
          results
        });
      } catch (error: any) {
        socket.emit("error", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);

      if (socket.data.role === "teacher" && activeTeacherSocketId === socket.id) {
        activeTeacherSocketId = null;
      }
    });

  });

};

