import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <BeakerMascot mood="sad" size={96} className="mx-auto mb-6" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">404</p>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Looks like this page wandered off. Let's get you back on track.
        </p>
        <Button onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
