'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Twitter, Youtube, Instagram, Check, X, Loader2, Settings, Wand2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface TwitterStatus {
  connected: boolean;
  account: {
    providerAccountId: string;
    accountName?: string;
    hasRefreshToken: boolean;
    isExpired: boolean;
  } | null;
}

interface YouTubeStatus {
  connected: boolean;
  account: {
    providerAccountId: string;
    accountName?: string;
    hasRefreshToken: boolean;
    isExpired: boolean;
  } | null;
}

export default function SettingsPage() {
  const { status } = useSession();
  const [twitterAccount, setTwitterAccount] = useState<TwitterStatus['account']>(null);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [twitterLoading, setTwitterLoading] = useState(true);
  const [youtubeAccount, setYoutubeAccount] = useState<YouTubeStatus['account']>(null);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeLoading, setYoutubeLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [instagramConnected, setInstagramConnected] = useState(false);

  // Fetch Twitter and YouTube connection status on mount (only if authenticated)
  useEffect(() => {
    // Wait for session to load before making API calls
    if (status === 'loading') {
      return; // Still checking session, wait
    }

    if (status === 'authenticated') {
      fetchTwitterStatus();
      fetchYoutubeStatus();
    } else {
      // Not logged in, skip API call to avoid 401 error
      setTwitterConnected(false);
      setTwitterLoading(false);
      setYoutubeConnected(false);
      setYoutubeLoading(false);
    }
  }, [status]);

  // Listen for OAuth success message from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'twitter-auth-success') {
        fetchTwitterStatus();
      }
      if (event.data?.type === 'youtube-auth-success') {
        fetchYoutubeStatus();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchTwitterStatus = async () => {
    try {
      setTwitterLoading(true);
      const response = await fetch('/api/auth/twitter/status', {
        credentials: 'include',
      });

      if (response.ok) {
        const data: TwitterStatus = await response.json();
        setTwitterConnected(data.connected);
        setTwitterAccount(data.account);
      } else {
        setTwitterConnected(false);
        setTwitterAccount(null);
      }
    } catch (error) {
      console.error('Error fetching Twitter status:', error);
      setTwitterConnected(false);
      setTwitterAccount(null);
    } finally {
      setTwitterLoading(false);
    }
  };

  const fetchYoutubeStatus = async () => {
    try {
      setYoutubeLoading(true);
      const response = await fetch('/api/auth/youtube/status', {
        credentials: 'include',
      });

      if (response.ok) {
        const data: YouTubeStatus = await response.json();
        setYoutubeConnected(data.connected);
        setYoutubeAccount(data.account);
      } else {
        setYoutubeConnected(false);
        setYoutubeAccount(null);
      }
    } catch (error) {
      console.error('Error fetching YouTube status:', error);
      setYoutubeConnected(false);
      setYoutubeAccount(null);
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    if (platform === 'twitter') {
      // Check if user is logged in first
      if (status !== 'authenticated') {
        // Open login page in popup
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const loginPopup = window.open(
          '/auth/signin?callbackUrl=/settings',
          'Login',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll to check if login was successful
        const checkLogin = setInterval(async () => {
          try {
            // Check if popup is closed
            if (loginPopup?.closed) {
              clearInterval(checkLogin);
              // Refresh the page to update session
              window.location.reload();
            }
          } catch {
            // Ignore cross-origin errors
          }
        }, 500);

        return;
      }

      if (twitterConnected) {
        // Disconnect
        try {
          const response = await fetch('/api/auth/twitter/status', {
            method: 'DELETE',
          });
          if (response.ok) {
            setTwitterConnected(false);
            setTwitterAccount(null);
          }
        } catch (error) {
          console.error('Failed to disconnect Twitter:', error);
        }
      } else {
        // Open Twitter OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
          '/api/auth/twitter/authorize',
          'Twitter Login',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    }

    if (platform === 'youtube') {
      if (youtubeConnected) {
        // Disconnect YouTube
        setYoutubeLoading(true);
        try {
          await fetch('/api/auth/youtube/status', { method: 'DELETE' });
          setYoutubeConnected(false);
          setYoutubeAccount(null);
        } catch (error) {
          console.error('Error disconnecting YouTube:', error);
        } finally {
          setYoutubeLoading(false);
        }
      } else {
        // Open YouTube/Google OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
          '/api/auth/youtube/authorize',
          'YouTube Login',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    }

    if (platform === 'instagram') {
      // Instagram coming soon
      alert('Instagram integration coming soon. Requires Meta Business account.');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              <h1 className="font-black text-2xl tracking-tight">Settings</h1>
            </div>
            <p className="text-xs text-secondary">Connect your social media accounts</p>
          </div>

          <Link href="/setup">
            <Button variant="default" className="gap-2">
              <Wand2 className="h-4 w-4" />
              Setup Wizard
            </Button>
          </Link>
        </div>

        {/* Platform Connections - One Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Twitter */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-medium">Twitter</CardTitle>
                </div>
                {twitterConnected ? (
                  <Check className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <X className="h-3.5 w-3.5 text-text-muted" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[10px] text-secondary">
                {twitterLoading
                  ? 'Checking...'
                  : twitterConnected && twitterAccount?.accountName
                  ? `@${twitterAccount.accountName}`
                  : twitterConnected
                  ? 'Connected'
                  : status !== 'authenticated'
                  ? 'Login required'
                  : 'Not connected'}
              </div>
              <Button
                onClick={() => handleConnect('twitter')}
                variant={twitterConnected ? 'outline' : 'default'}
                className="w-full h-7 text-xs"
                disabled={twitterLoading || status === 'loading'}
              >
                {twitterLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Loading
                  </>
                ) : twitterConnected ? (
                  'Disconnect'
                ) : status !== 'authenticated' ? (
                  'Login to Connect'
                ) : (
                  'Connect'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* YouTube */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-medium">YouTube</CardTitle>
                </div>
                {youtubeConnected ? (
                  <Check className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <X className="h-3.5 w-3.5 text-text-muted" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[10px] text-secondary">
                {youtubeLoading
                  ? 'Checking...'
                  : youtubeConnected && youtubeAccount?.accountName
                  ? youtubeAccount.accountName
                  : youtubeConnected
                  ? 'Connected'
                  : 'Not connected'}
              </div>
              <Button
                onClick={() => handleConnect('youtube')}
                variant={youtubeConnected ? 'outline' : 'default'}
                className="w-full h-7 text-xs"
                disabled={youtubeLoading}
              >
                {youtubeLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Loading
                  </>
                ) : youtubeConnected ? (
                  'Disconnect'
                ) : (
                  'Connect'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Instagram */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-medium">Instagram</CardTitle>
                </div>
                {instagramConnected ? (
                  <Check className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <X className="h-3.5 w-3.5 text-text-muted" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[10px] text-secondary">
                {instagramConnected ? 'Connected' : 'Coming soon'}
              </div>
              <Button
                onClick={() => handleConnect('instagram')}
                variant={instagramConnected ? 'outline' : 'default'}
                className="w-full h-7 text-xs"
                disabled={!instagramConnected}
              >
                {instagramConnected ? 'Disconnect' : 'Coming Soon'}
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}
