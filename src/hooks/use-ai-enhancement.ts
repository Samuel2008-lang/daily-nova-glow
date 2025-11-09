import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAIEnhancement = () => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { toast } = useToast();

  const enhanceText = async (text: string, context?: string): Promise<string> => {
    if (!text || text.trim() === '') return text;

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-text', {
        body: { text, context }
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Enhancement failed",
          description: data.error,
          variant: "destructive",
        });
        return text;
      }

      return data?.enhanced || text;
    } catch (error) {
      console.error("Error enhancing text:", error);
      toast({
        title: "Enhancement failed",
        description: "Could not enhance text. Using original.",
        variant: "destructive",
      });
      return text;
    } finally {
      setIsEnhancing(false);
    }
  };

  return { enhanceText, isEnhancing };
};
