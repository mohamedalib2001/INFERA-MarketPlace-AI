import { useMutation } from "@tanstack/react-query";
import { api, type InsertSubscriber } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useCreateSubscriber() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertSubscriber) => {
      const res = await fetch(api.subscribers.create.path, {
        method: api.subscribers.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        // Handle specific error codes if needed, or parse JSON error
        const errorData = await res.json().catch(() => ({}));
        
        if (res.status === 409) {
          throw new Error("You are already on the list!");
        }
        
        throw new Error(errorData.message || "Failed to subscribe");
      }

      return await res.json(); // Returns { success: boolean, message: string }
    },
    onSuccess: () => {
      toast({
        title: "Welcome aboard!",
        description: "You've been added to our waitlist.",
        variant: "default", // Using default as successful
        className: "bg-green-600 text-white border-none",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Something went wrong",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
