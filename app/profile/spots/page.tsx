import { Metadata } from 'next';
import SpotsPage from '@/modules/profile/ui/pages/SpotsPage';
import { APP_NAME } from '@/shared/constants/app';

export const metadata: Metadata = {
  title: `My Spots — ${APP_NAME}`,
  description: `Locations you have shared with the ${APP_NAME} community.`,
};

export default function ProfileSpotsPage() {
  return <SpotsPage />;
}
