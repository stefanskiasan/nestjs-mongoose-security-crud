import 'reflect-metadata';
//@ts-ignore
import * as bcrypt from "bcrypt";
export class PermissionManager{
  static defaultPermissions(readRoles: string[] = [], writeRoles: string[] = [], deleteRoles: string[] = []) {
    // tslint:disable-next-line:ban-types
    return function (constructor: Function) {
      //@ts-ignore
      Reflect.defineMetadata('mmc__Roles', {
        readRoles,
        writeRoles,
        deleteRoles
      }, constructor);
    };
  }
  static secret(roles = [], customprefix = '') {
    // tslint:disable-next-line:only-arrow-functions
    return function (target: any, propertyKey: string) {
      //@ts-ignore
      const currentMetadata = Reflect.getMetadata('mmc_angularPropertySecret', target) || {};
      currentMetadata[customprefix + propertyKey] = roles;
      //@ts-ignore
      Reflect.defineMetadata('mmc_angularPropertySecret', currentMetadata, target);
    };
  }

  static hashPasswordField(schema: any, userNameField: string, passwordField: string, salt: string | number){
    schema.pre('save', function (next: any) {
      console.log("save");
      //@ts-ignore
      bcrypt.hash(this[userNameField]+this[passwordField], salt).then((encryptPassword) => {
        //@ts-ignore
        this[passwordField] = encryptPassword;
        //@ts-ignore
        this.permissionReaderUserId.push(this._id);
        //@ts-ignore
        this.permissionWriterUserId.push(this._id);
        //@ts-ignore
        this.permissionDeleteUserID.push(this._id);
        next()
      });
    });
    schema.pre('updateOne', function (next: any) {
      console.log("updates");
      next();
    });
  }
  static prepareUserAsOwner(schema: any){
    schema.pre('save', function (next: any) {
      //@ts-ignore
      this.permissionReaderUserId.push(this._id);
      //@ts-ignore
      this.permissionWriterUserId.push(this._id);
      //@ts-ignore
      this.permissionDeleteUserID.push(this._id);
      next()
    });
  }

public  static securityCheck(schema: any, dbClass: any){
  const roles = Reflect.getMetadata('mmc__Roles', dbClass);
  schema.pre('save', function (next: any) {
     if(roles) {
       this.permissionReaderRoles = roles.readRoles;
       this.permissionWriterRoles = roles.writeRoles;
       this.permissionDeleteRoles = roles.deleteRoles;
     }
    next()
  });

  }
}
