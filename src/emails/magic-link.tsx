import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";

export type MagicLinkEmailProps = {
  url: string;
};

export function MagicLinkEmail({ url }: MagicLinkEmailProps) {
  return (
    <EmailLayout preview="Your sign-in link">
      <Heading className="m-0 text-xl font-bold text-gray-900">Sign in</Heading>
      <Text className="text-gray-700">
        Click the button below to sign in. This link expires in 24 hours.
      </Text>
      <Button
        href={url}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
      >
        Sign in
      </Button>
      <Text className="text-xs text-gray-500">
        If you didn&apos;t request this, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}

MagicLinkEmail.PreviewProps = {
  url: "https://example.com/api/auth/callback/resend?token=preview",
} satisfies MagicLinkEmailProps;

export default MagicLinkEmail;
