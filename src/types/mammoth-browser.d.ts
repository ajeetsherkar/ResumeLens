declare module "mammoth/mammoth.browser" {
  interface RawTextResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  interface ExtractRawTextInput {
    arrayBuffer: ArrayBuffer;
  }

  const mammoth: {
    extractRawText(input: ExtractRawTextInput): Promise<RawTextResult>;
  };

  export default mammoth;
}
