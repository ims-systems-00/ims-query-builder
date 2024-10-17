export interface QueryBuilderOptions {
    searchFields?: string[];
    strictObjectIdMatch?: boolean;
}
export declare class QueryBuilder {
    private filterQuery;
    private filterQueryStr;
    private searchFields;
    private strictObjectIdMatch;
    private queryOptions;
    constructor(queryObjet: any | null, options?: QueryBuilderOptions);
    private dotNotate;
    private formatOperators;
    private formatOptions;
    private search;
    build(): this;
    getFilterQueryString(): string;
    getFilterQuery(): any;
    getQueryOptions(): {
        sort?: string;
        select?: string;
        page?: number;
        limit?: number;
    };
}
