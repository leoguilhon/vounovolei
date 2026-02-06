package br.com.vounovolei.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class StaticMediaConfig implements WebMvcConfigurer {

    private final UploadProperties props;

    public StaticMediaConfig(UploadProperties props) {
        this.props = props;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path base = Path.of(props.getBaseDir()).toAbsolutePath().normalize();
        String location = base.toUri().toString(); // file:/.../uploads/

        registry.addResourceHandler("/media/**")
                .addResourceLocations(location)
                .setCachePeriod(3600);
    }
}
