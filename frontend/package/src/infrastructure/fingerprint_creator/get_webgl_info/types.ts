export type TWebGL = Partial<{
    result: object;
    errors: string[];
}>;

export type TWebGLInfo = Partial<{
    webGL: TWebGL;
    webGL2: TWebGL;
}>;
