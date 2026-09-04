import { useCallback, useRef } from 'react';

export type Props = {
    acceptedTypes: string[];
    handleSelectedFile: (file: File) => void;
    handleError: (error: Error) => void;
};

export default function useInputFile(props: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const inputAccept = props.acceptedTypes.map((type) => '.' + type).join(', ');

    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        event.stopPropagation();
        inputRef.current?.click();
    }, []);

    const getFile = useCallback((files: FileList | null) => {
        if (files === null || files.length === 0 || files.item(0) === null) throw new Error('No file found');
        return files.item(0)!;
    }, []);

    const validateMimeType = useCallback(
        (file: File) => {
            const [, mimeType] = file.type.split('/');
            if (!props.acceptedTypes.includes(mimeType)) throw new Error('Selected file contains invalid MIME type');
        },
        [props.acceptedTypes]
    );

    const selectFile = useCallback(
        (files: FileList | null) => {
            const file = getFile(files);
            validateMimeType(file);
            return file;
        },
        [getFile, validateMimeType]
    );

    const handleChangeEvent = useCallback(
        (event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
            try {
                const selectedFile = selectFile(event.target.files);
                props.handleSelectedFile(selectedFile);
            } catch (err) {
                console.error(err);
                props.handleError(err as Error);
            }
        },
        [props, selectFile]
    );

    return {
        inputRef,
        inputAccept,
        handleClick,
        selectFile,
        handleChangeEvent,
    };
}
