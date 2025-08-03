
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { 
  UserLocation, 
  LightningStrikeWithDistance, 
  Notification,
  CreateUserLocationInput,
  ZipCodeLookupResponse 
} from '../../server/src/schema';

function App() {
  // User and location state
  const [userId] = useState<string>('user_123'); // In real app, this would come from auth
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [zipCode, setZipCode] = useState<string>('');
  const [isSettingLocation, setIsSettingLocation] = useState(false);
  
  // Lightning strikes state
  const [nearbyStrikes, setNearbyStrikes] = useState<LightningStrikeWithDistance[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingStrikes, setIsLoadingStrikes] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState<string>('tracker');
  const [error, setError] = useState<string>('');

  // Load user's current location
  const loadUserLocation = useCallback(async () => {
    try {
      const location = await trpc.getUserLocation.query({ user_id: userId });
      setUserLocation(location);
    } catch (error) {
      console.error('Failed to load user location:', error);
    }
  }, [userId]);

  // Load nearby lightning strikes
  const loadNearbyStrikes = useCallback(async () => {
    if (!userLocation) return;
    
    setIsLoadingStrikes(true);
    try {
      const strikes = await trpc.getNearbyStrikes.query({
        user_id: userId,
        radius_miles: 20,
        hours_back: 24
      });
      setNearbyStrikes(strikes);
    } catch (error) {
      console.error('Failed to load nearby strikes:', error);
      setError('Failed to load lightning data');
    } finally {
      setIsLoadingStrikes(false);
    }
  }, [userId, userLocation]);

  // Load user notifications
  const loadNotifications = useCallback(async () => {
    try {
      const userNotifications = await trpc.getUserNotifications.query({ user_id: userId });
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, [userId]);

  // Set user location by ZIP code
  const handleSetLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipCode.trim()) return;

    setIsSettingLocation(true);
    setError('');

    try {
      // First lookup the ZIP code to get coordinates
      const zipData: ZipCodeLookupResponse = await trpc.lookupZipCode.query({ 
        zip_code: zipCode.trim() 
      });

      // Create location input with the ZIP data
      const locationInput: CreateUserLocationInput = {
        user_id: userId,
        zip_code: zipData.zip_code,
        latitude: zipData.latitude,
        longitude: zipData.longitude,
        city: zipData.city,
        state: zipData.state
      };

      // Create or update user location
      const newLocation = await trpc.createUserLocation.mutate(locationInput);
      setUserLocation(newLocation);
      setZipCode('');
      setError('');
    } catch (error) {
      console.error('Failed to set location:', error);
      setError('Invalid ZIP code or failed to set location');
    } finally {
      setIsSettingLocation(false);
    }
  };

  // Auto-detect location using browser geolocation
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsSettingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Create location with coordinates (ZIP would be reverse-geocoded on backend)
          const locationInput: CreateUserLocationInput = {
            user_id: userId,
            zip_code: '00000', // Placeholder - backend should reverse geocode
            latitude,
            longitude
          };

          const newLocation = await trpc.createUserLocation.mutate(locationInput);
          setUserLocation(newLocation);
        } catch (error) {
          console.error('Failed to save detected location:', error);
          setError('Failed to save detected location');
        } finally {
          setIsSettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Failed to detect location. Please enter ZIP code manually.');
        setIsSettingLocation(false);
      }
    );
  };

  // Simulate real-time updates every 30 seconds
  useEffect(() => {
    if (!userLocation) return;

    const interval = setInterval(() => {
      loadNearbyStrikes();
      loadNotifications();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [userLocation, loadNearbyStrikes, loadNotifications]);

  // Initial data load
  useEffect(() => {
    loadUserLocation();
  }, [loadUserLocation]);

  useEffect(() => {
    if (userLocation) {
      loadNearbyStrikes();
      loadNotifications();
    }
  }, [userLocation, loadNearbyStrikes, loadNotifications]);

  const formatDistance = (miles: number): string => {
    return miles < 1 ? `${(miles * 5280).toFixed(0)} ft` : `${miles.toFixed(1)} mi`;
  };

  const getIntensityColor = (intensity: number): string => {
    if (intensity >= 80) return 'bg-red-500';
    if (intensity >= 60) return 'bg-orange-500';
    if (intensity >= 40) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getIntensityLabel = (intensity: number): string => {
    if (intensity >= 80) return 'Severe';
    if (intensity >= 60) return 'Strong';
    if (intensity >= 40) return 'Moderate';
    return 'Light';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            ⚡ Lightning Tracker
          </h1>
          <p className="text-slate-300">Real-time lightning strike monitoring and alerts</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-500 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Location Setup */}
        {!userLocation && (
          <Card className="mb-6 bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white">📍 Set Your Location</CardTitle>
              <CardDescription className="text-slate-300">
                Enter your ZIP code or auto-detect your location to start tracking lightning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSetLocation} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter ZIP code (e.g., 90210)"
                  value={zipCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setZipCode(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder-slate-300"
                  pattern="^\d{5}(-\d{4})?$"
                  required
                />
                <Button 
                  type="submit" 
                  disabled={isSettingLocation}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSettingLocation ? 'Setting...' : 'Set Location'}
                </Button>
              </form>
              
              <div className="text-center">
                <span className="text-slate-300">or</span>
              </div>
              
              <Button
                onClick={handleAutoDetectLocation}
                disabled={isSettingLocation}
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10"
              >
                🎯 Auto-Detect My Location
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {userLocation && (
          <>
            {/* Current Location Display */}
            <Card className="mb-6 bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Current Location</h3>
                    <p className="text-slate-300">
                      {userLocation.city}, {userLocation.state} {userLocation.zip_code}
                    </p>
                    <p className="text-sm text-slate-400">
                      {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                    </p>
                  </div>
                  <Button
                    onClick={() => setUserLocation(null)}
                    variant="outline"
                    size="sm"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Change Location
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm">
                <TabsTrigger value="tracker" className="data-[state=active]:bg-white/20">
                  ⚡ Live Tracker
                </TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-white/20">
                  🔔 Notifications ({notifications.length})
                </TabsTrigger>
              </TabsList>

              {/* Live Tracker Tab */}
              <TabsContent value="tracker" className="space-y-6">
                <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">Recent Lightning Activity</CardTitle>
                        <CardDescription className="text-slate-300">
                          Strikes within 20 miles in the last 24 hours
                        </CardDescription>
                      </div>
                      <Button
                        onClick={loadNearbyStrikes}
                        disabled={isLoadingStrikes}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoadingStrikes ? 'Refreshing...' : '🔄 Refresh'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {nearbyStrikes.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-300 text-lg">⚡ No recent lightning activity</p>
                        <p className="text-slate-400 text-sm mt-2">
                          This is good news! We'll notify you when strikes are detected.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {nearbyStrikes.map((strike: LightningStrikeWithDistance) => (
                          <div
                            key={strike.id}
                            className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  className={`${getIntensityColor(strike.intensity)} text-white`}
                                >
                                  {getIntensityLabel(strike.intensity)}
                                </Badge>
                                <span className="text-white font-medium">
                                  {formatDistance(strike.distance_miles)} away
                                </span>
                              </div>
                              <span className="text-slate-300 text-sm">
                                {strike.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-slate-300 text-sm">
                              <p>📍 {strike.latitude.toFixed(4)}, {strike.longitude.toFixed(4)}</p>
                              <p>⚡ Intensity: {strike.intensity}/100</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6">
                <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Lightning Alerts</CardTitle>
                    <CardDescription className="text-slate-300">
                      Email notifications sent for nearby lightning strikes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {notifications.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-300 text-lg">📧 No notifications yet</p>
                        <p className="text-slate-400 text-sm mt-2">
                          You'll receive email alerts when lightning strikes within 20 miles.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {notifications.map((notification: Notification) => (
                          <div
                            key={notification.id}
                            className="p-4 rounded-lg bg-white/5 border border-white/10"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                                  Alert Sent
                                </Badge>
                                <span className="text-white font-medium">
                                  {formatDistance(notification.distance_miles)} away
                                </span>
                              </div>
                              {notification.email_sent_at && (
                                <span className="text-slate-300 text-sm">
                                  📧 {notification.email_sent_at.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-300 text-sm">
                              Lightning strike detected {formatDistance(notification.distance_miles)} from your location.
                              {notification.email_sent ? ' Email notification sent.' : ' Email pending.'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Footer */}
        <Separator className="my-8 bg-white/20" />
        <div className="text-center text-slate-400 text-sm">
          <p>🌩️ Stay safe during thunderstorms • US coverage only</p>
          <p className="mt-1">Data updates every 30 seconds</p>
        </div>
      </div>
    </div>
  );
}

export default App;
