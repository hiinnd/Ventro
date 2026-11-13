import {
  WorkspaceScreen,
  workspaceMetadata,
  type WorkspaceProps,
} from '../../../../components/organizations/workspace-screen';
export const metadata = workspaceMetadata;
export default function Page(props: WorkspaceProps) {
  return <WorkspaceScreen {...props} view="organizations" />;
}
