import transformers
if not hasattr(transformers, "T5TokenizerFast"):
    from transformers.tokenization_utils_fast import PreTrainedTokenizerFast
    from transformers.models.t5.tokenization_t5 import T5Tokenizer
    class T5TokenizerFast(PreTrainedTokenizerFast):
        vocab_files_names = {"vocab_file": "spiece.model", "tokenizer_file": "tokenizer.json"}
        model_input_names = ["input_ids", "attention_mask"]
        slow_tokenizer_class = T5Tokenizer
        def __init__(self, vocab_file=None, tokenizer_file=None, **kw):
            super().__init__(vocab_file=vocab_file, tokenizer_file=tokenizer_file, **kw)
    transformers.T5TokenizerFast = T5TokenizerFast
    transformers.models.t5.T5TokenizerFast = T5TokenizerFast
    print("T5TokenizerFast patch applied")
else:
    print("T5TokenizerFast already exists, skipping patch")
