import { Plus } from "lucide-react";
import { Button } from "./button";

interface AddHabitButtonProps {
  onClick: () => void;
}

export default function AddHabitButton({ onClick }: AddHabitButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
    >
      <Plus className="h-5 w-5" />
      Add New Habit
    </Button>
  );
}
