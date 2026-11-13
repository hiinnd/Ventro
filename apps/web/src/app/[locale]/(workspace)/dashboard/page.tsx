import {
  DashboardScreen,
  dashboardMetadata,
  type DashboardPageProps,
} from '../../../../components/dashboard/screen';
export const metadata = dashboardMetadata;
export default function Page(props: DashboardPageProps) {
  return <DashboardScreen {...props} />;
}
