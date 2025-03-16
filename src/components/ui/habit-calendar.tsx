import { useState } from "react";
import { Calendar } from "./calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { CheckCircle2, X } from "lucide-react";

interface HabitCalendarProps {
  habitId: string;
  habitName: string;
  completedDates: Date[];
  missedDates?: Date[];
  onDateClick?: (date: Date) => void;
}

export default function HabitCalendar({
  habitId,
  habitName,
  completedDates = [],
  missedDates = [],
  onDateClick,
}: HabitCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Function to check if a date is in the completedDates array
  const isDateCompleted = (date: Date) => {
    return completedDates.some(
      (completedDate) =>
        completedDate.getDate() === date.getDate() &&
        completedDate.getMonth() === date.getMonth() &&
        completedDate.getFullYear() === date.getFullYear(),
    );
  };

  // Function to check if a date is in the missedDates array
  const isDateMissed = (date: Date) => {
    return missedDates.some(
      (missedDate) =>
        missedDate.getDate() === date.getDate() &&
        missedDate.getMonth() === date.getMonth() &&
        missedDate.getFullYear() === date.getFullYear(),
    );
  };

  // Handle date selection
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && onDateClick) {
      onDateClick(selectedDate);
    }
    setDate(selectedDate);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{habitName}</CardTitle>
        <CardDescription>
          Calendar view of your habit completion
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center mb-4 space-x-4">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm">Completed</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
            <span className="text-sm">Missed</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-gray-200 mr-2"></div>
            <span className="text-sm">Not Tracked</span>
          </div>
        </div>

        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          className="rounded-md border"
          modifiers={{
            completed: completedDates,
            missed: missedDates,
          }}
          modifiersClassNames={{
            completed: "bg-green-100 text-green-800 font-bold",
            missed: "bg-red-100 text-red-800 font-bold",
          }}
          components={{
            DayContent: ({ date, displayMonth }) => {
              const day = date.getDate();
              const isCompleted = isDateCompleted(date);
              const isMissed = isDateMissed(date);

              return (
                <div className="relative w-full h-full flex items-center justify-center">
                  {day}
                  {isCompleted && (
                    <CheckCircle2 className="absolute bottom-0 right-0 h-3 w-3 text-green-600" />
                  )}
                  {isMissed && (
                    <X className="absolute bottom-0 right-0 h-3 w-3 text-red-600" />
                  )}
                </div>
              );
            },
          }}
        />
      </CardContent>
    </Card>
  );
}
