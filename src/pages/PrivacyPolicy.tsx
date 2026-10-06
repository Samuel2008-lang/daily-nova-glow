import { ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import policy from "@/content/privacy-policy.txt?raw";

const sections = policy.trim().split("\n\n");

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <main className="container mx-auto px-4 py-8 md:pt-24 pb-28 max-w-3xl">
      <div className="flex items-center justify-between gap-4 mb-8">
        <Button variant="ghost" size="icon" aria-label="Back to Settings" onClick={() => navigate("/settings")}><ArrowLeft className="h-5 w-5" /></Button>
        <Button variant="outline" asChild><a href="/privacy-policy.html" download="Daily-Nova-Privacy-Policy.html"><Download className="h-4 w-4 mr-2" />Download</a></Button>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Daily Nova Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Effective date: October 6, 2026</p>
      <div className="space-y-8">
        {sections.slice(1).map((section) => {
          const [heading, ...paragraphs] = section.split("\n");
          return <section key={heading}><h2 className="text-xl font-semibold text-foreground mb-3">{heading}</h2><div className="space-y-3 text-muted-foreground leading-7 break-words">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section>;
        })}
      </div>
    </main>
  );
}