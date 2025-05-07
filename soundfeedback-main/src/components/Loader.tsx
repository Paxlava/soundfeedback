import { Loader2 } from "lucide-react";

const Loader = () => {
  return (
    <>
      <div className="z-10 bg-background fixed inset-0 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    </>
  );
};

export default Loader;
