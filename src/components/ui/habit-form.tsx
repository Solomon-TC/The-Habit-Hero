import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Switch } from "./switch";

interface HabitFormProps {
  initialData?: {
    id?: string;
    name: string;
    description: string;
    frequency: string;
    reminderTime?: string;
    reminderEnabled: boolean;
    xpValue?: number;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export default function HabitForm({
  initialData = {
    name: "",
    description: "",
    frequency: "daily",
    reminderEnabled: false,
    xpValue: 10,
  },
  onSubmit,
  onCancel,
  isEditing = false,
}: HabitFormProps) {
  const [formData, setFormData] = useState(initialData);
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

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, reminderEnabled: checked }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Habit name is required";
    }

    if (formData.reminderEnabled && !formData.reminderTime) {
      newErrors.reminderTime =
        "Reminder time is required when reminders are enabled";
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
        <CardTitle>{isEditing ? "Edit Habit" : "Create New Habit"}</CardTitle>
        <CardDescription>
          {isEditing
            ? "Update your habit details below"
            : "Fill in the details to create a new habit to track"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Habit Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Morning Meditation"
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
              placeholder="Add details about your habit"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              name="frequency"
              value={formData.frequency}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, frequency: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekdays">Weekdays</SelectItem>
                <SelectItem value="weekends">Weekends</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="reminderEnabled">Enable Reminders</Label>
              <Switch
                id="reminderEnabled"
                checked={formData.reminderEnabled}
                onCheckedChange={handleSwitchChange}
              />
            </div>

            {formData.reminderEnabled && (
              <div className="space-y-2">
                <Label htmlFor="reminderTime">Reminder Time</Label>
                <Input
                  id="reminderTime"
                  name="reminderTime"
                  type="time"
                  value={formData.reminderTime || ""}
                  onChange={handleChange}
                  className={errors.reminderTime ? "border-red-500" : ""}
                />
                {errors.reminderTime && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.reminderTime}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="xpValue">XP Value</Label>
            <Input
              id="xpValue"
              name="xpValue"
              type="number"
              min="1"
              max="100"
              value={formData.xpValue || 10}
              onChange={handleChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              XP earned each time you complete this habit (1-100)
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {isEditing ? "Update Habit" : "Create Habit"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
