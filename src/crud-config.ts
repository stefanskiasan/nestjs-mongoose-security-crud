import { CrudOptions } from "./crud.interface";
import { get, merge } from 'lodash'
import jwt_decode from "jwt-decode";

export const defaultPaginate = {
  data: 'data',
  total: 'total',
  lastPage: 'lastPage',
  currentPage: 'page',
}

export class CrudConfig {
  public static options: CrudOptions = {
    routes: {
      find: {
        paginate: {...defaultPaginate}
      }
    },
    filterSecurity: false,
    filterSecurityHeaderCookieOption: true,
    filterSecurityHeaderKey: 'Authorization',
    filterSecurityExtractToken: (token) => { return jwt_decode(token)['_id'];}
  }
  ;
  static setup(options: CrudOptions) {
    this.options = merge({}, this.options, options);
  }
  static get(key, defaultValue = undefined) {
    return get(this.options, key, defaultValue)
  }
}
