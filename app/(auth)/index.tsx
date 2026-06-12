import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/lib/auth/AuthProvider';
import { signInWithApple, signInWithGoogle, useAppleSignInAvailable } from '@/lib/auth/oauth';

type OAuthProvider = 'apple' | 'google';

export default function SignInScreen() {
  const { signInWithEmail } = useAuth();
  const appleAvailable = useAppleSignInAvailable();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

  async function handleSignIn() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    setOauthLoading(provider);
    try {
      await (provider === 'apple' ? signInWithApple() : signInWithGoogle());
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not sign in with ${provider === 'apple' ? 'Apple' : 'Google'}.`);
    } finally {
      setOauthLoading(null);
    }
  }

  return (
    <Screen scroll>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Welcome back</Text>
        <Text className="mb-8 mt-1 text-base text-neutral-500 dark:text-neutral-400">
          Sign in to keep track of your home and vehicle maintenance.
        </Text>

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
          autoComplete="current-password"
          textContentType="password"
          placeholder="••••••••"
        />

        {error ? (
          <Text className="mb-4 text-sm text-red-600" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Button label="Sign in" onPress={handleSignIn} loading={isSubmitting} />

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
          <Text className="text-neutral-500 dark:text-neutral-400">Don&apos;t have an account? </Text>
          <Link href="/sign-up" className="font-semibold text-brand-600 dark:text-brand-400">
            Sign up
          </Link>
        </View>
      </View>
    </Screen>
  );
}
