import EventEmitter from "events";

export interface Credentials {
  gcm: {
    token: string;
    androidId: string;
    securityToken: string;
    appId: string;
  };
  keys: {
    privateKey: string;
    publicKey: string;
    authSecret: string;
  };
  fcm: {
    token: string;
    pushSet: string;
  };
}

export interface Notification {
  notification: {
    from: string;
    priority: "normal" | "high";
    notification: {
      title: string;
      body: string;
      data: {
        // custom data
        [key: string]: string;
      };
    };
    fcmMessageId: string;
  };
  persistentId: string; // notification unique id
}

export class Client extends EventEmitter {
  public constructor(credentials: Credentials, persistentIds: string[])
  public destroy(): void
}

export function register(senderId: string): Credentials | null;

export async function listen(
  credentails: Credentials,
  notificationCallback: (notification: Notification) => void
): Promise<Client>;
