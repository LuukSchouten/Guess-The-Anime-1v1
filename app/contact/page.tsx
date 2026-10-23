export const metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <section className="max-w-prose space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Contact</h1>
      <p className="text-muted-foreground">
        You can contact me via email, LinkedIn, or GitHub.
      </p>
      <div className="grid gap-3">
        <a
          href="mailto:nikita.tysiachnyi@gmail.com"
          className="border-border hover:bg-muted rounded border p-4"
        >
          Email
        </a>
        <a
          href="https://linkedin.com/in/niktys"
          className="border-border hover:bg-muted rounded border p-4"
        >
          LinkedIn
        </a>
        <a
          href="https://github.com/tysiachnyi"
          className="border-border hover:bg-muted rounded border p-4"
        >
          GitHub
        </a>
      </div>
    </section>
  );
}
