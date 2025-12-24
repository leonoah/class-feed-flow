import { useEffect } from "react";

const Man = () => {
  useEffect(() => {
    console.info("Easter egg: user found the man page");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">you found the man</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          This is a hidden easter egg page.
        </p>
        <a
          href="/"
          className="text-primary underline hover:text-primary/90"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default Man;