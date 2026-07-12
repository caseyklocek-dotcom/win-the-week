import { Card, Label } from "./ui";

export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <Label>Coming up next</Label>
        <h1 className="mt-1 text-2xl font-bold text-charcoal-900">{title}</h1>
        <p className="mt-2 text-charcoal-600">{note}</p>
      </Card>
    </div>
  );
}
