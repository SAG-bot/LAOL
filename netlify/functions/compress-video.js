const path = require("path");

let ffmpegPath;
let ffmpeg;
try {
  const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
  ffmpegPath = ffmpegInstaller.path;
  ffmpeg = require("fluent-ffmpeg");
  ffmpeg.setFfmpegPath(ffmpegPath);
} catch (err) {
  console.warn("⚠️ FFmpeg not available in this environment:", err.message);
  ffmpeg = null; // mark ffmpeg as unavailable
}

exports.handler = async (event) => {
  try {
    const { filePath, outputPath } = JSON.parse(event.body);

    if (!ffmpeg) {
      console.log("⚠️ Skipping compression, returning original file.");
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          file: filePath, // return the uncompressed file
          warning: "Compression skipped (FFmpeg not available).",
        }),
      };
    }

    // Run compression
    await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .outputOptions([
          "-vcodec libx264",
          "-crf 28", // adjust quality/size
          "-preset veryfast",
        ])
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        file: outputPath,
      }),
    };
  } catch (err) {
    console.error("❌ Compression failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
