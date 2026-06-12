import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/lib/auth/AuthProvider';
import { signInWithApple, signInWithGoogle, useAppleSignInAvailable } from '@/lib/auth/oauth';

type OAuthProvider = 'apple' | 'google';

export default function SignUpScreen() {
  const { signUpWithEmail } = useAuth();
  const appleAvailable = useAppleSignInAvailable();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

  async function handleSignUp() {
    setError(null);
    setMessage(null);

    if (!email.trim() || !password) {
      setError('Enter your email and a password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { needsEmailConfirmation } = await signUpWithEmail(email.trim(), password, displayName.trim() || undefined);
      if (needsEmailConfirmation) {
        setMessage('Check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    setMessage(null);
    setOauthLoading(provider);
    try {
      await (provider === 'apple' ? signInWithApple() : signInWithGoogle());
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not sign up with ${provider === 'apple' ? 'Apple' : 'Google'}.`);
    } finally {
      setOauthLoading(null);
    }
  }

  return (
    <Screen scroll>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Create your account</Text>
        <Text className="mb-8 mt-1 text-base text-neutral-500 dark:text-neutral-400">
          Takes less than a minute. We&apos;ll set up your household automatically.
        </Text>

        <TextField
          label="Name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          placeholder="Jamie Rivera"
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="At least 8 characters"
        />
        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="••••••••"
        />

        {error ? (
          <Text className="mb-4 text-sm text-red-600" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        {message ? (
          <Text className="mb-4 text-sm text-status-ok" accessibilityRole="alert">
            {message}
          </Text>
        ) : null}

        <Button label="Create account" onPress={handleSignUp} loading={isSubmitting} />

        <View className="my-6 flex-row items-center">
          <View className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          <Text className="mx-3 text-sm text-neutral-400">or</Text>
          <View className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        </View>

        <View className="gap-3">
          {appleAvailable ? (
            <Button
              label="Continue with Apple"
              variant="secondary"
              onPress={() => handleOAuth('apple')}
              loading={oauthLoading === 'apple'}
            />
          ) : null}
          <Button
            label="Continue with Google"
            variant="secondary"
            onPress={() => handleOAuth('google')}
            loading={oauthLoading === 'google'}
          />
        </View>

        <View className="mt-8 flex-row justify-center">
          <Text className="text-neutral-500 dark:text-neutral-400">Already have an account? </Text>
          <Link href="/" className="font-semibold text-brand-600 dark:text-brand-400">
            Sign in
          </Link>
        </View>
      </View>
    </Screen>
  );
}
