package br.com.vounovolei.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.uploads")
public class UploadProperties {

    private String baseDir;
    private String avatarsDir;
    private long maxAvatarBytes;

    public String getBaseDir() {
        return baseDir;
    }

    public void setBaseDir(String baseDir) {
        this.baseDir = baseDir;
    }

    public String getAvatarsDir() {
        return avatarsDir;
    }

    public void setAvatarsDir(String avatarsDir) {
        this.avatarsDir = avatarsDir;
    }

    public long getMaxAvatarBytes() {
        return maxAvatarBytes;
    }

    public void setMaxAvatarBytes(long maxAvatarBytes) {
        this.maxAvatarBytes = maxAvatarBytes;
    }
}
