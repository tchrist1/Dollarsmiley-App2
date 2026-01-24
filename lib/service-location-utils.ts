import { ServiceType, Profile } from '@/types/database';

export function getServiceLocationDisplay(
  serviceType: ServiceType | undefined,
  profile: Profile | undefined
): string {
  const profileLocation = profile?.location;
  const hasProfileLocation = profileLocation && profileLocation.trim().length > 0;

  if (!serviceType) {
    return hasProfileLocation ? profileLocation : 'Remote';
  }

  switch (serviceType) {
    case 'In-Person':
      return hasProfileLocation ? profileLocation : 'Location not set';

    case 'Remote':
      return 'Remote';

    case 'Both':
      if (hasProfileLocation) {
        return `Remote & ${profileLocation}`;
      }
      return 'Remote & Location not set';

    default:
      return hasProfileLocation ? profileLocation : 'Remote';
  }
}
