import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

interface GoalFormProps {
  initialData?: {
    id?: string;
    name: string;
    description: string;
    targetDate?: Date | string;
    status?: string;
    linkedHabits?: string[];
    xpValue?: number;
  };
  habits?: Array<{ id: string; name: string }>;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export default function GoalForm({
  initialData = {
    name: "",
    description: "",
    status: "in_progress",
    linkedHabits: [],
    xpValue: 50,
  },
  habits = [],
  onSubmit,
  onCancel,
  isEditing = false,
}: GoalFormProps) {
  // Convert string date to Date object if needed
  const initialDate = initialData.targetDate
    ? typeof initialData.targetDate === "string"
      ? new Date(initialData.targetDate)
      : initialData.targetDate
    : undefined;

  const [formData, setFormData] = useState({
    ...initialData,
    targetDate: initialDate,
  });
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDateChange = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setFormData((prev) => ({ ...prev, targetDate: selectedDate }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Goal name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Goal" : "Create New Goal"}</CardTitle>
        <CardDescription>
          {isEditing
            ? "Update your goal details below"
            : "Set a new goal to work towards"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Run a Marathon"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add details about your goal"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="xpValue">XP Value</Label>
            <Input
              id="xpValue"
              name="xpValue"
              type="number"
              min="1"
              max="500"
              value={formData.xpValue || 50}
              onChange={handleChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              XP earned when this goal is completed (1-500)
            </p>
          </div>

          {habits.length > 0 && (
            <div className="space-y-2">
              <Label>Linked Habits (Optional)</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {habits.map((habit) => (
                  <div key={habit.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`habit-${habit.id}`}
                      checked={formData.linkedHabits?.includes(habit.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => {
                          const currentLinkedHabits = prev.linkedHabits || [];
                          return {
                            ...prev,
                            linkedHabits: checked
                              ? [...currentLinkedHabits, habit.id]
                              : currentLinkedHabits.filter(
                                  (id) => id !== habit.id,
                                ),
                          };
                        });
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor={`habit-${habit.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {habit.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {isEditing ? "Update Goal" : "Create Goal"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
