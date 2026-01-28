import { Server, Socket } from "socket.io";
import { PollService } from "../services/poll.service";
import { VoteService } from "../services/vote.service";

export const registerPollSocket = (io: Server) => {

  io.on("connection", (socket: Socket) => {

    console.log("Socket connected:", socket.id);

    socket.on("join_student", async ({ name }) => {
      socket.data.studentName = name;

      const activePoll = await PollService.getActivePoll();

      if (activePoll) {
        const remaining =
          PollService.calculateRemainingTime(activePoll);

        socket.emit("poll_started", {
          poll: activePoll,
          remainingTime: remaining
        });
      }
    });

    socket.on("join_teacher", async () => {

      const activePoll = await PollService.getActivePoll();

      if (activePoll) {
        const remaining =
          PollService.calculateRemainingTime(activePoll);

        socket.emit("poll_started", {
          poll: activePoll,
          remainingTime: remaining
        });
      }
    });

    socket.on("create_poll", async (data) => {
      try {
        const poll = await PollService.createPoll(data);

        io.emit("poll_started", {
          poll,
          remainingTime: poll.duration
        });
      } catch (error: any) {
        socket.emit("error", error.message);
      }
    });

    socket.on("submit_vote", async ({ pollId, optionId }) => {
      try {
        const studentName = socket.data.studentName;

        const results =
          await VoteService.submitVote(
            pollId,
            studentName,
            optionId
          );

        io.emit("vote_update", {
          pollId,
          results
        });
      } catch (error: any) {
        socket.emit("error", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });

  });

};
