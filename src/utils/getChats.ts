// import Chat from "../modules/Chat/chat.schema";
// import UnreadMessage from "../modules/Chat/unreadMessages";



// export const getChats = async (user: any) => {
//     const chats = await Chat.find({
//         "members.memberId": user.id
//     })
//         .populate({
//             path: "lastMessage"
//         })
//         .populate({
//             path: "members.memberId",
//             select: "name profilePic"
//         })
//         .sort({ updatedAt: -1 })
//         .lean();

//     const unread = await UnreadMessage.find({
//         userId: user.id
//     }).lean();


//     const unreadMap = new Map(
//         unread.map(u => [u?.chatId?.toString(), u])
//     );

//     const formattedChats = chats.map(chat => {

//         const otherMember = chat.members.find(
//             (m: any) => m.memberId._id.toString() !== user.id
//         );

//         const member = otherMember?.memberId as any;

//         const unreadData = unreadMap.get(chat._id.toString());

//         return {
//             id: chat._id,

//             person: member
//                 ? {
//                     _id: member._id,
//                     name: member.name,
//                     profilePic: member.profilePic
//                 }
//                 : null,

//             lastMessage: chat.lastMessage,

//             unreadCount: unreadData?.unreadCount || 0
//         };
//     });

//     return formattedChats;

// }