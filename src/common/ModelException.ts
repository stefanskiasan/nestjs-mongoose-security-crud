export class ModelException {
    protected message = '';
    protected innerException: any = null;

    constructor(message: string, innerException: any = null) {
        this.message = message;
        this.innerException = innerException;

        console.error('[ModelException]', this.toString());
    }

    public toString(): string {
        let msg = this.message;
        let innerException = this.innerException;

        while (innerException) {
            msg += `\n> ${innerException.message}`;
            innerException = innerException.innerException;
        }

        return msg;
    }
}
