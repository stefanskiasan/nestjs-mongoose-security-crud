import { Model, Document } from "mongoose";
import {
  Get,
  Param,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Req
} from "@nestjs/common";
import { ApiOperation, ApiQuery } from "@nestjs/swagger";
import { CrudQuery, ICrudQuery } from "./crud-query.decorator";
import { CrudConfig, defaultPaginate } from "./crud-config";
import { get, merge } from "lodash";
import { CrudOptionsWithModel, PaginateKeys, Fields } from "./crud.interface";
import { CRUD_FIELD_METADATA } from "./constants";

export class CrudPlaceholderDto {
  fake?: string;
  [key: string]: any;
}

export class CrudController {
  constructor(
    public model: Model<{} | any>,
    public crudOptions?: CrudOptionsWithModel
  ) {}

  @Get("config")
  @ApiOperation({ summary: "API Config", operationId: "config" })
  async config(@Req() req) {
    const { config } = this.crudOptions;
    if (typeof config === "function") {
      return config.call(this, req);
    }
    return config;
  }

  @Get()
  @ApiOperation({ summary: "Find all records", operationId: "list" })
  @ApiQuery({
    name: "query",
    type: String,
    required: false,
    description: "Query options"
  })
  find(@Req() Req,@CrudQuery("query") query: ICrudQuery = {}) {

    let {
      where = get(this.crudOptions, "routes.find.where", {}),
      limit = get(this.crudOptions, "routes.find.limit", 10),
      page = 1,
      skip = 0,
      populate = get(this.crudOptions, "routes.find.populate", undefined),
      sort = get(this.crudOptions, "routes.find.sort", undefined),
      collation = undefined
    } = query;

    let select = '';
    if(Req.query.select) {
      select = Req.query.select;
    }

    if (skip < 1) {
      skip = (page - 1) * limit;
    }

    const paginateKeys: PaginateKeys | false = get(
      this.crudOptions,
      "routes.find.paginate",
      defaultPaginate
    );

    const find = async () => {
      if (this.crudOptions.filterSecurity){
        if (this.crudOptions.filterSecurity === true){

          where = await filterSecurityFunctionAll(where,Req, this);
          select = await checkPropertyPermissions(select, Req, this);
        }
      }
      let data = await this.model
        .find()
        .where(where)
        .select(select)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .populate(populate)
        .collation(collation);

      if (paginateKeys !== false) {
        const total = await this.model.countDocuments(where);
        return {
          [paginateKeys.total]: total,
          [paginateKeys.data]: data,
          [paginateKeys.lastPage]: Math.ceil(total / limit),
          [paginateKeys.currentPage]: page
        };
      }

      return data;
    };
    return find();
  }

  @Get(":id")
  @ApiOperation({ summary: "Find a record" })
  async findOne(@Req() Req,@Param("id") id: string, @CrudQuery("query") query: ICrudQuery = {}) {
    let {
      where = get(this.crudOptions, "routes.findOne.where", {}),
      populate = get(this.crudOptions, "routes.findOne.populate", undefined),
      select = get(this.crudOptions, "routes.findOne.select", null)
    } = query;
    if (this.crudOptions.filterSecurity){
      if (this.crudOptions.filterSecurity === true){
        where = await filterSecurityFunctionOne(where,Req, this);
        select = await checkPropertyPermissions(select, Req, this);
      }
    }
    const data = this.model
        .findById(id)
        .populate(populate)
        .select(select)
        .where(where);
    if(data){
      return data;
    } else {
      return "Permission denied";
    }
  }

  @Post()
  @ApiOperation({ summary: "Create a record" })
  async create(@Req() Req,@Body() body: CrudPlaceholderDto) {
    const transform = get(this.crudOptions, "routes.create.transform");
    if (transform) {
      body = transform(body);
    }
    if (this.crudOptions.filterSecurity){
      if (this.crudOptions.filterSecurity === true){
        if(await checkCreatePermissions(Req, this) === true) {
          return this.model.create(body);
        } else {
          return "Permission denied";
        }
      }
    } else {
      return this.model.create(body);
    }
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a record" })
 async update(@Req() Req, @Param("id") id: string, @Body() body: CrudPlaceholderDto) {
    const transform = get(this.crudOptions, "routes.update.transform");
    if (transform) {
      body = transform(body);
    }
    if (this.crudOptions.filterSecurity){
      if(await checkUpdatePermissions(Req, this, id) === true) {
        return this.model.findOneAndUpdate({ _id: id }, body, {
          new: true,
          upsert: false,
          runValidators: true
        });
      } else {
        return "Permission denied";
      }
    } else {
      return this.model.findOneAndUpdate({ _id: id }, body, {
        new: true,
        upsert: false,
        runValidators: true
      });
    }
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a record" })
  async delete(@Req() Req,@Param("id") id: string) {
    if (this.crudOptions.filterSecurity){
      if(await checkDeletePermissions(Req, this, id) === true) {
        return this.model.findOneAndRemove({ _id: id });
      } else {
        return "Permission denied";
      }
    } else{
      return this.model.findOneAndRemove({ _id: id });
    }
  }


}
function getValueFromCookie (cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(`;`).forEach(function (cookie) {
    let [name, ...rest] = cookie.split(`=`);
    name = name?.trim();
    if (!name) return;
    const value = rest.join(`=`).trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });
  return list;
}
async function  filterSecurityFunctionAll(where, Req, that){
  let token = "";
  let userId = "";
  if(that.crudOptions.filterSecurityHeaderCookieOption === true) {
    token = getValueFromCookie(Req.headers.cookie)[that.crudOptions.filterSecurityHeaderKey];
  } else {
    token = Req.headers[that.crudOptions.filterSecurityHeaderKey];
  }
  userId = that.crudOptions.filterSecurityExtractToken(token);

  let dataGroup = await  that['groupService'].model.find().where({
    members:userId
  })
  let listReaderRoles = [];
  dataGroup.forEach((dataItem) => {
    dataItem.permissions.forEach((permission) => {
      if(listReaderRoles.includes((dataSubItem) => {
        return dataSubItem === permission;
      }) === false){
        listReaderRoles.push(permission);
      }
    });
  });

  where['$or'] = [
    {
      'permissionReaderUserId':userId
    },
    {
      'permissionReaderRoles': {
        "$in":listReaderRoles
      }
    }
  ];

  if (that.crudOptions.filterSecurityFunction){
    where = that.crudOptions.filterSecurityFunction(where,userId);
  }
  if( that.crudOptions.filterSecurityFindAllFunction){
    where = that.crudOptions.filterSecurityFindAllFunction(where,userId,listReaderRoles);
  }
  return where;
}
async function  filterSecurityFunctionOne(where, Req, that){
  let token = "";
  let userId = "";
  if(that.crudOptions.filterSecurityHeaderCookieOption === true) {
    token = getValueFromCookie(Req.headers.cookie)[that.crudOptions.filterSecurityHeaderKey];
  } else {
    token = Req.headers[that.crudOptions.filterSecurityHeaderKey];
  }
  userId = that.crudOptions.filterSecurityExtractToken(token);

  let dataGroup = await  that['groupService'].model.find().where({
    members:userId
  })
  let listReaderRoles = [];
  dataGroup.forEach((dataItem) => {
    dataItem.permissions.forEach((permission) => {
      if(listReaderRoles.includes((dataSubItem) => {
        return dataSubItem === permission;
      }) === false){
        listReaderRoles.push(permission);
      }
    });
  });

  where['$or'] = [
    {
      'permissionReaderUserId':userId
    },
    {
      'permissionReaderRoles': {
        "$in":listReaderRoles
      }
    }
  ];

  if (that.crudOptions.filterSecurityFunction){
    where = that.crudOptions.filterSecurityFunction(where,userId);
  }
  if( that.crudOptions.filterSecurityFindOneFunction){
    where = that.crudOptions.filterSecurityFindOneFunction(where,userId,listReaderRoles);
  }
  return where;
}
async function checkCreatePermissions(Req, that){
  let token = "";
  let userId = "";
  let createExampleModel = new that.model();

  if(that.crudOptions.filterSecurityHeaderCookieOption === true) {
    token = getValueFromCookie(Req.headers.cookie)[that.crudOptions.filterSecurityHeaderKey];
  } else {
    token = Req.headers[that.crudOptions.filterSecurityHeaderKey];
  }
  userId = that.crudOptions.filterSecurityExtractToken(token);

  let dataGroup = await  that['groupService'].model.find().where({
    members:userId
  })
  let listReaderRoles = [];
  dataGroup.forEach((dataItem) => {
    dataItem.permissions.forEach((permission) => {
      if(listReaderRoles.includes((dataSubItem) => {
        return dataSubItem === permission;
      }) === false){
        listReaderRoles.push(permission);
      }
    });
  });
  let permissionWriterRoles = false;
  listReaderRoles.forEach((dataItem) => {
    if(createExampleModel.permissionWriterRoles.includes(dataItem) === true) {
      permissionWriterRoles = true;
    }
  });
  if(that.crudOptions.filterSecurityCreateFunction) {
    permissionWriterRoles = that.crudOptions.filterSecurityCreateFunction(userId,permissionWriterRoles)
  }

  return permissionWriterRoles;
}
async function checkUpdatePermissions(Req, that, id) {
  let token = "";
  let userId = "";
  const data = await that.model
      .findById(id);
  if(that.crudOptions.filterSecurityHeaderCookieOption === true) {
    token = getValueFromCookie(Req.headers.cookie)[that.crudOptions.filterSecurityHeaderKey];
  } else {
    token = Req.headers[that.crudOptions.filterSecurityHeaderKey];
  }
  userId = that.crudOptions.filterSecurityExtractToken(token);

  let dataGroup = await  that['groupService'].model.find().where({
    members:userId
  })
  let listReaderRoles = [];
  dataGroup.forEach((dataItem) => {
    dataItem.permissions.forEach((permission) => {
      if(listReaderRoles.includes((dataSubItem) => {
        return dataSubItem === permission;
      }) === false){
        listReaderRoles.push(permission);
      }
    });
  });
  let permissionWriterRoles = false;
  if(data.permissionWriterUserId.includes(userId) === true) {
    permissionWriterRoles = true;
  }
  listReaderRoles.forEach((dataItem) => {
    if(data.permissionWriterRoles.includes(dataItem) === true) {
      permissionWriterRoles = true;
    }
  });
  if(that.crudOptions.filterSecurityUpdateFunction) {
    permissionWriterRoles = that.crudOptions.filterSecurityUpdateFunction(userId,permissionWriterRoles)
  }
  return permissionWriterRoles;
}
async function checkDeletePermissions(Req, that,id) {
  let token = "";
  let userId = "";
  const data = await that.model
      .findById(id);
  if(that.crudOptions.filterSecurityHeaderCookieOption === true) {
    token = getValueFromCookie(Req.headers.cookie)[that.crudOptions.filterSecurityHeaderKey];
  } else {
    token = Req.headers[that.crudOptions.filterSecurityHeaderKey];
  }
  userId = that.crudOptions.filterSecurityExtractToken(token);

  let dataGroup = await  that['groupService'].model.find().where({
    members:userId
  })
  let listReaderRoles = [];
  dataGroup.forEach((dataItem) => {
    dataItem.permissions.forEach((permission) => {
      if(listReaderRoles.includes((dataSubItem) => {
        return dataSubItem === permission;
      }) === false){
        listReaderRoles.push(permission);
      }
    });
  });
  let permissionDeleteRoles = false;
  if(data.permissionDeleteUserId.includes(userId) === true) {
    permissionDeleteRoles = true;
  }
  listReaderRoles.forEach((dataItem) => {
    if(data.permissionDeleteRoles.includes(dataItem) === true) {
      permissionDeleteRoles = true;
    }
  });
  if(that.crudOptions.filterSecurityDeleteFunction) {
    permissionDeleteRoles = that.crudOptions.filterSecurityDeleteFunction(userId,permissionDeleteRoles)
  }
  return permissionDeleteRoles;
}
async function checkPropertyPermissions(select, Req, that){
  if(select === null){
    select = '';
  }
  let token = "";
  let userId = "";
  if(that.crudOptions.filterSecurityHeaderCookieOption === true) {
    token = getValueFromCookie(Req.headers.cookie)[that.crudOptions.filterSecurityHeaderKey];
  } else {
    token = Req.headers[that.crudOptions.filterSecurityHeaderKey];
  }
  userId = that.crudOptions.filterSecurityExtractToken(token);

  let dataGroup = await  that['groupService'].model.find().where({
    members:userId
  })
  let listReaderRoles = [];
  dataGroup.forEach((dataItem) => {
    dataItem.permissions.forEach((permission) => {
      if(listReaderRoles.includes((dataSubItem) => {
        return dataSubItem === permission;
      }) === false){
        listReaderRoles.push(permission);
      }
    });
  });

    for(let permissionDataItem in that.crudOptions.filterSecurityPropertiesRoles){
      let permissionForField = false;
        listReaderRoles.forEach((roleDataItem) => {
         if(that.crudOptions.filterSecurityPropertiesRoles[permissionDataItem].includes(roleDataItem) === true){
          permissionForField = true;
         }
        });
      if(permissionForField === false) {
        if(select.indexOf(permissionDataItem) !== -1){
          select = select.replace(permissionDataItem, '');
        }
        select = select + ' -' + permissionDataItem;
      }
    }

  return select;
}
