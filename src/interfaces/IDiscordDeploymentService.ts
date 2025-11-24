export interface DeploymentInfo {
  deploymentId?: string;
  environment?: string;
  version?: string;
  duration?: number;
  message?: string;
}

export interface IDiscordDeploymentService {
  sendDeploymentNotification(
    event: 'deployment.started' | 'deployment.success' | 'deployment.failure',
    deploymentInfo: DeploymentInfo
  ): Promise<void>;
}
