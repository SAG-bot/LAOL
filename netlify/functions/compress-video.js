const ffmpeg = require("@ffmpeg-installer/ffmpeg");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
  try {
    const { fileName, fileData } = JSON.parse(event.body);

    const inputPath = path.join("/tmp", fileName);
    const outputPath = path.join("/tmp", "compressed_" + fileName);

    // Write input video to tmp
    fs.writeFileSync(inputPath, Buffer.from(fileData, "base64"));

    // Run ffmpeg compression
    await new Promise((resolve, reject) => {
      const proc = spawn(ffmpeg.path, [
        "-i", inputPath,
        "-vcodec", "libx264",
        "-crf", "28",
        "-preset", "fast",
        outputPath,
      ]);

      proc.on("close", (code) => {
        code === 0 ? resolve() : reject(new Error("FFmpeg compression failed"));
      });
    });

    // Read compressed video
    const compressedFile = fs.readFileSync(outputPath);

    return {
      statusCode: 200,
      body: JSON.stringify({
        fileName: "compressed_" + fileName,
        fileData: compressedFile.toString("base64"),
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
