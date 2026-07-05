import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";

export type WelcomeEmailProps = {
  name?: string;
  appUrl: string;
};

export function WelcomeEmail({ name, appUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview="Welcome aboard">
      <Heading className="m-0 text-xl font-bold text-gray-900">
        Welcome{name ? `, ${name}` : ""}!
      </Heading>
      <Text className="text-gray-700">
        Thanks for signing up. We&apos;re glad you&apos;re here. Replace this
        copy with your own onboarding message.
      </Text>
      <Button
        href={appUrl}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
      >
        Get started
      </Button>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  name: "Ada",
  appUrl: "https://example.com",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
