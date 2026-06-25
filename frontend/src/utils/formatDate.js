import { format, isToday, isYesterday } from "date-fns";

export const formatMessageTime = (date) => format(new Date(date), "h:mm a");

export const formatConversationDate = (date) => {
  const value = new Date(date);
  if (isToday(value)) return "Today";
  if (isYesterday(value)) return "Yesterday";
  return format(value, "MMM d");
};

export const formatLastSeen = (date) => {
  if (!date) return "Recently active";

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Recently active";
  if (isToday(value)) return `Last seen today at ${format(value, "h:mm a")}`;
  if (isYesterday(value)) return `Last seen yesterday at ${format(value, "h:mm a")}`;

  return `Last seen ${format(value, "MMM d, h:mm a")}`;
};
