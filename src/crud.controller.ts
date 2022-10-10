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
    console.log(this.crudOptions.routes.find);
    let {
      where = get(this.crudOptions, "routes.find.where", {}),
      limit = get(this.crudOptions, "routes.find.limit", 10),
      page = 1,
      skip = 0,
      populate = get(this.crudOptions, "routes.find.populate", undefined),
      sort = get(this.crudOptions, "routes.find.sort", undefined),
      collation = undefined
    } = query;

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
          let token = "";
          let userId = "";
          if(this.crudOptions.filterSecurityHeaderCookieOption === true) {
            token = getValueFromCookie(Req.headers.cookie)[this.crudOptions.filterSecurityHeaderKey];
          } else {
            token = Req.headers[this.crudOptions.filterSecurityHeaderKey];
          }
          userId = this.crudOptions.filterSecurityExtractToken(token);

          let dataGroup = await  this['groupService'].model.find().where({
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

          if (this.crudOptions.filterSecurityFunction){
            where = this.crudOptions.filterSecurityFunction(where,userId);
          }
        }
      }
      let data = await this.model
        .find()
        .where(where)
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
  findOne(@Param("id") id: string, @CrudQuery("query") query: ICrudQuery = {}) {
    let {
      where = get(this.crudOptions, "routes.findOne.where", {}),
      populate = get(this.crudOptions, "routes.findOne.populate", undefined),
      select = get(this.crudOptions, "routes.findOne.select", null)
    } = query;
    return this.model
      .findById(id)
      .populate(populate)
      .select(select)
      .where(where);
  }

  @Post()
  @ApiOperation({ summary: "Create a record" })
  create(@Body() body: CrudPlaceholderDto) {
    const transform = get(this.crudOptions, "routes.create.transform");
    if (transform) {
      body = transform(body);
    }
    return this.model.create(body);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a record" })
  update(@Param("id") id: string, @Body() body: CrudPlaceholderDto) {
    const transform = get(this.crudOptions, "routes.update.transform");
    if (transform) {
      body = transform(body);
    }
    return this.model.findOneAndUpdate({ _id: id }, body, {
      new: true,
      upsert: false,
      runValidators: true
    });
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a record" })
  delete(@Param("id") id: string) {
    return this.model.findOneAndRemove({ _id: id });
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
