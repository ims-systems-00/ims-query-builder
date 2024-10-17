import mongoose from "mongoose";

function _mongoIdTypeCastIfvalid(obj) {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      let value = obj[key];

      // Check if the value is a string and looks like a MongoDB ObjectID
      if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
        // Convert the string to a mongoose.Types.ObjectId
        obj[key] = new mongoose.Types.ObjectId(value);
      } else if (typeof value === "object") {
        // Recursively call the function for nested objects
        obj[key] = _mongoIdTypeCastIfvalid(value);
      }
    }
  }
  return obj;
}
export interface QueryBuilderOptions {
  searchFields?: string[];
  strictObjectIdMatch?: boolean;
}
export class QueryBuilder {
  private filterQuery: any;
  private filterQueryStr: string;
  private searchFields: string[];
  private strictObjectIdMatch: boolean;
  private queryOptions: {
    sort?: string;
    select?: string;
    page?: number;
    limit?: number;
  };
  constructor(
    queryObjet: any | null,
    options: QueryBuilderOptions = {
      searchFields: [],
      strictObjectIdMatch: false,
    }
  ) {
    this.filterQuery = queryObjet || {};
    this.queryOptions = {
      sort: "",
      select: "",
      page: 1,
      limit: 10,
    };
    this.filterQueryStr = JSON.stringify(queryObjet);
    this.searchFields = options?.searchFields || [];
    this.strictObjectIdMatch = options?.strictObjectIdMatch || false;
  }
  private dotNotate(obj: any, target: any, prefix: string | "") {
    target = target || {};
    prefix = prefix || "";
    Object.keys(obj).forEach((key) => {
      if (key[0] === "$" && prefix) {
        return (target[prefix.slice(0, prefix.length - 1)] = obj);
      }
      if (typeof obj[key] === "object" && obj[key] !== null) {
        this.dotNotate(obj[key], target, prefix + key + ".");
      } else {
        return (target[prefix + key] = obj[key]);
      }
    });
    this.filterQuery = { ...target };
    this.filterQueryStr = JSON.stringify(target);
    return this;
  }
  private formatOperators() {
    // Mapping of custom operators to MongoDB operators
    const operatorMap = {
      or: "$or",
      gt: "$gt",
      gte: "$gte",
      options: "$options",
      lt: "$lt",
      lte: "$lte",
      elemMatch: "$elemMatch",
      in: "$in",
      nin: "$nin",
      ne: "$ne",
      equals: "$eq",
      all: "$all",
      regex: "$regex",
    };
    function processObject(obj: any) {
      const result = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === "object" && obj[key] !== null) {
            let foundOperator = false;
            // Check for operators and convert them
            for (const op in operatorMap) {
              if (obj[key].hasOwnProperty(op)) {
                let operatorNest = obj[key][op];
                if (
                  typeof operatorNest === "object" &&
                  operatorNest !== null &&
                  !Array.isArray(operatorNest)
                )
                  result[key] = {
                    [operatorMap[op]]: processObject(operatorNest),
                  };
                else result[key] = { [operatorMap[op]]: operatorNest };
                foundOperator = true;
                break;
              }
            }
            if (!foundOperator) {
              // Recursively process nested objects
              result[key] = processObject(obj[key]);
            }
          } else {
            // Directly assign other values
            result[key] = obj[key];
          }
        }
      }
      return result;
    }
    let query = processObject(this.filterQuery);
    this.filterQuery = query;
    this.filterQueryStr = JSON.stringify(query);
    return this;
  }
  private formatOptions() {
    // assert options
    this.queryOptions.page = this.filterQuery.page;
    this.queryOptions.limit = this.filterQuery.limit;
    this.queryOptions.select = this.filterQuery.select;
    this.queryOptions.sort = this.filterQuery.sort;
    // delete options
    delete this.filterQuery.page;
    delete this.filterQuery.limit;
    delete this.filterQuery.select;
    delete this.filterQuery.sort;
    return this;
  }
  private search() {
    console.log("search", this.filterQuery.clientSearch);
    if (!this.filterQuery.clientSearch || !this.searchFields.length) {
      delete this.filterQuery["clientSearch"];
      this.filterQueryStr = JSON.stringify(this.filterQuery);
      return this;
    }

    let searchQuery = this.filterQuery.$or || [];
    this.filterQuery.$or = [
      ...searchQuery,
      ...this.searchFields.map((field) => {
        return {
          [field]: {
            $regex:
              this.filterQuery.clientSearch && this.filterQuery.clientSearch,
            $options: "i",
          },
        };
      }),
    ];
    delete this.filterQuery["clientSearch"];
    this.filterQueryStr = JSON.stringify(this.filterQuery);
    return this;
  }
  public build() {
    /**
     * Sequence of function call matters here, if correct sequence is not maintained
     * search feature along with some other will break.
     */
    this.formatOptions();
    this.formatOperators();
    this.dotNotate(JSON.parse(this.filterQueryStr), {}, "");
    this.search();
    console.log("this.filterQueryStr", this.filterQueryStr);
    return this;
  }
  public getFilterQueryString() {
    return this.filterQueryStr;
  }
  public getFilterQuery() {
    return this.strictObjectIdMatch
      ? _mongoIdTypeCastIfvalid(JSON.parse(this.filterQueryStr))
      : JSON.parse(this.filterQueryStr);
  }
  public getQueryOptions() {
    return this.queryOptions;
  }
}
