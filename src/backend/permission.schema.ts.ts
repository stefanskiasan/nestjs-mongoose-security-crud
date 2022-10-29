//@ts-ignore
import {Prop, Schema} from "@nestjs/mongoose";
import {PermissionManager} from "./permissionManager";

@Schema()
export class Permissions {
  @PermissionManager.secret([])
  @Prop()
  public permissionReaderRoles: string[] = [];
  @Prop()
  public permissionWriterRoles: string[] = [];
  @Prop()
  public permissionDeleteRoles: string[] = [];
  @Prop()
  public permissionReaderUserId: string[] = [];
  @Prop()
  public permissionWriterUserId: string[] = [];
  @Prop()
  public permissionDeleteUserID: string[] = [];
}
