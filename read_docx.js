import mammoth from "mammoth";
import fs from "fs";

mammoth.extractRawText({path: "SHRADDHA 7029 Final Project.docx"})
    .then(function(result){
        var text = result.value;
        fs.writeFileSync("docx_extracted_text.txt", text);
        console.log("Success! Extracted text written to docx_extracted_text.txt");
    })
    .catch(function(err){
        console.error(err);
    });
