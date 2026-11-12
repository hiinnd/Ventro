import { AuthScreen, authMetadata, type AuthPageProps } from '../../../../components/auth/auth-screen';
export const generateMetadata = (props: AuthPageProps) => authMetadata(props, 'register');
export default function Page(props: AuthPageProps) { return <AuthScreen {...props} view="register" />; }
