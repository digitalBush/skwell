/* eslint-disable no-dupe-class-members */
declare module "skwell"
{
	import type { Readable } from "stream";

	export type Params = {
		[k:string]: {
			val :any;
			type: any
		};
	}

	export type QueryResult = Record<string, any>

	export class Api {
		constructor();

		bulkLoad( ...args: any[] ): void;
		execute( command: Promise<string> | string, params?: Params ): Promise<number>;
		file( relativeFile: string ): Promise<string>;
		executeBatch( command: Promise<string> | string, params?: Params ): void;
		fromFile( relativeFile: string ): Promise<string>;
		query( command: Promise<string> | string, params?: Params ): Promise<QueryResult[]>;
		queryFirst( command: Promise<string> | string, params?: Params ): Promise<QueryResult>;
		query<T>( command: Promise<string> | string, params?: Params ): Promise<T[]>;
		queryFirst<T>( command: Promise<string> | string, params?: Params ): Promise<T>;
		querySets<T>( command: Promise<string> | string, params?: Params ): Promise<T>;
		queryStream( command: Promise<string> | string, params?: Params ): Readable;
		queryValue<T>( command: Promise<string> | string, params?: Params ): Promise<T>;
		sproc( procedure: string ): Promise<string>;
		tvp( cols: any ): void;
		on( event: "error", callback: ( error: Error ) => void ): this;
	}

	export class Transaction extends Api {
		public context: Record<string, any>;
		constructor( connection: any, context: Record<string, any> );
		constructor( executor: ( tx:Transaction ) => void, context: Record<string, any> );

		withConnection( ...args: any[] ): void;

		static run( ...args: any[] ): void;
	}

	export class Client extends Api {
		transaction( executor: ( tx:Transaction ) => void, context: Record<string, any> ):void;
		withConnection( ...args: any[] ): void;
		bigint(): void;
		binary( length: any ): void;
		bit(): void;
		char( length: any ): void;
		date(): void;
		datetime(): void;
		datetime2( scale: any ): void;
		datetimeoffset( scale: any ): void;
		decimal( precision: any, scale: any ): void;
		float(): void;
		image(): void;
		int(): void;
		money(): void;
		nchar( length: any ): void;
		ntext(): void;
		numeric( precision: any, scale: any ): void;
		nvarchar( length: number ): void;
		nvarchar_max: void; // eslint-disable-line camelcase
		real(): void;
		smalldatetime(): void;
		smallint(): void;
		smallmoney(): void;
		text(): void;
		time( scale: any ): void;
		tinyint(): void;
		udt(): void;
		uniqueidentifier(): void;
		varbinary( length: any ): void;
		varbinary_max: void; // eslint-disable-line camelcase
		varchar( length: any ): void;
		varchar_max: void; // eslint-disable-line camelcase
		variant(): void;
		xml(): void;
	}

	export interface SqlConfig {
		username: string;
		password: string;
		server: string;
		database: string;
		domain?: string;
		authenticationType?: "default" | "ntlm";
		port?: number;
		requestTimeout?: number;
		connectTimeout?: number;
		pool?: {
			min?: number;
			max?: number;
		};
		onBeginTransaction: ( tx: Transaction ) => Promise<void>;
		onEndTransaction: ( tx: Transaction ) => Promise<void>;
	}

	export function connect( config: SqlConfig ): Client;
}
