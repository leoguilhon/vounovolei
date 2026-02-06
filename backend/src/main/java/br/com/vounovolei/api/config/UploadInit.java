package br.com.vounovolei.api.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Files;
import java.nio.file.Path;

@Configuration
public class UploadInit {

    @Bean
    ApplicationRunner initUploads(UploadProperties props) {
        return args -> Files.createDirectories(Path.of(props.getAvatarsDir()));
    }
}