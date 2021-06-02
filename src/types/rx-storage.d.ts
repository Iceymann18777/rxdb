import type { ChangeEvent } from 'event-reduce-js';
import { BlobBuffer } from './pouch';
import { MangoQuery } from './rx-query';
import { RxJsonSchema } from './rx-schema';


/**
 * The document data how it comes out of the storage instance.
 * Contains all meta data like revision, attachments and deleted-flag.
 */
export type RxDocumentData<T> = T & {

    /**
     * As other NoSQL databases,
     * RxDB also assumes that no data is finally deleted.
     * Instead the documents are stored with _deleted: true
     * which means they will not be returned at queries.
     */
    // deleted is optional. If not set, we assume _deleted: false
    // TODO make it required to ensure we have to correct value and type everywhere.
    _deleted?: boolean;

    /**
     * The attachments meta data is stored besides to document.
     */
    _attachments: {
        [attachmentId: string]: RxAttachmentData;
    }

    /**
     * Contains a revision which is concated with a [height: number]-[identifier: string]
     * like: '1-3hl4kj3l4kgj34g34glk'.
     * The revision is used to detect write conflicts and have a document history.
     * Revisions behave similar to couchdb revisions:
     * @link https://docs.couchdb.org/en/stable/replication/conflicts.html#revision-tree

     * When you create a new document, do not send a revision,
     * When you update an existing document, send the previous revision.
     * When you insert via overwrite: true, send the new revision you want to save the document with.
     */
    _rev: string;
}

/**
 * The document data how it is send to the
 * storage instance to save it.
 */
export type RxDocumentWriteData<T> = T & {

    // deleted is optional. If not set, we assume _deleted: false
    // TODO make it required to ensure we have to correct value and type everywhere.
    _deleted?: boolean;

    _attachments: {
        /**
         * To create a new attachment, set the write data
         * To delete an attachment, leave it out on the _attachments property.
         * To change an attachment, set the new write data.
         * To not touch an attachment, just send the stub again
         * which came out of the storage instance.
         */
        [attachmentId: string]: RxAttachmentData | RxAttachmentWriteData;
    }

    /**
     * When overwrite: false
     * The previous revision only exists if the document already existed.
     * If the previous revision is not the same as the documents revision stored in the database,
     * we have a write conflict that must be resolved.
     * When we insert a new document, use '1-new' as revision.
     *
     * When overwrite: true
     * The new revision is stored with the document
     * so that other write processes can know that they provoked a conflict
     * because the current revision is not the same as before.
     * The [height] of the new revision must be heigher then the [height] of the old revision.
     */
    _rev?: string;
};


/**
 * Data which is needed for new attachments
 */
export type RxAttachmentWriteData = {
    /**
     * Content type like 'plain/text'
     */
    type: string;
    /**
     * The data of the attachment.
     */
    data: BlobBuffer;
}

/**
 * Meta data of the attachment how it comes out of the storage engine.
 */
export type RxAttachmentData = {
    /**
     * Content type like 'plain/text'
     */
    type: string;
    /**
     * The digest which is the output of the hash function
     * from storage.hash(attachment.data)
     */
    digest: string;
    /**
     * Size of the attachments data
     */
    length: number;
}


export type RxLocalDocumentData<
    Data = {
        // local documents are schemaless and contain any data
        [key: string]: any
    }
    > = {
        // Local documents always have _id as primary
        _id: string;

        // local documents cannot have attachments,
        // so this must always be an empty object.
        _attachments: {};

        _deleted?: boolean;
        _rev?: string;
    } & Data;

/**
 * Error that can happer per document when
 * RxStorage.bulkWrite() is called
 */
export type RxStorageBulkWriteError<RxDocType> = {

    status: number |
    409 // conflict
    // TODO add other status codes from pouchdb
    ;

    /**
     * set this property to make it easy
     * to detect if the object is a RxStorageBulkWriteError
     */
    isError: true;

    // primary key of the document
    documentId: string;

    // the original document data that should have been written.
    document: RxDocumentWriteData<RxDocType>;
}

export type RxStorageBulkWriteResponse<DocData> = {
    /**
     * A map that is indexed by the documentId
     * contains all succeded writes.
     */
    success: Map<string, RxDocumentData<DocData>>;

    /**
     * A map that is indexed by the documentId
     * contains all errored writes.
     */
    error: Map<string, RxStorageBulkWriteError<DocData>>;
}

export type RxLocalStorageBulkWriteResponse<DocData> = {
    /**
     * A map that is indexed by the documentId
     * contains all succeded writes.
     */
    success: Map<string, RxDocumentData<DocData>>;

    /**
     * A map that is indexed by the documentId
     * contains all errored writes.
     */
    error: Map<string, RxStorageBulkWriteError<DocData>>;
}


export type PreparedQuery<DocType> = MangoQuery<DocType> | any;

/**
 * We return a complex object instead of a single array
 * so we are able to add additional fields in the future.
 */
export type RxStorageQueryResult<RxDocType> = {
    // the found documents, sort order is important.
    documents: RxDocumentData<RxDocType>[];
}



export type RxStorageInstanceCreationParams<DocumentData, InstanceCreationOptions> = {
    databaseName: string;
    collectionName: string;
    schema: RxJsonSchema<DocumentData>;
    options: InstanceCreationOptions;
}

export type ChangeStreamOptions = {

    /**
     * Sequence number of the first event to start with.
     * If you want to get all ongoing events,
     * first get the latest sequence number and input it here.
     * 
     * Optional on changeStream,
     * will start from the newest sequence.
     */
    startSequence?: number;
    /**
     * limits the amount of results
     */
    limit?: number;
}

export type ChangeStreamOnceOptions = ChangeStreamOptions & {
    /**
     * Start sequence is not optional
     * on one time changes.
     */
    startSequence: number;

    /**
     * On one-time change stream results,
     * we can define the sort order
     * to either get the newest or the oldest events.
     */
    order: 'asc' | 'desc';
};

export type ChangeStreamEvent<DocumentData> = ChangeEvent<RxDocumentData<DocumentData>> & {
    /**
     * An integer that is increasing
     * and unique per event.
     * Can be used to sort events or get information
     * about how many events there are.
     */
    sequence: number;
    /**
     * The value of the primary key
     * of the changed document
     */
    id: string;
};
