.PHONY: remove-images clean-db clean

# Determine the platform
ifdef ComSpec
    RM_IMAGES = docker run --rm -v //var/run/docker.sock:/var/run/docker.sock docker sh -c "docker images -q jacksonbarreto/* | xargs -r docker rmi"
    RM_DIR = if exist db_data rmdir /s /q db_data && if exist db_data_automation rmdir /s /q db_data_automation && if exist db_data_idp rmdir /s /q db_data_idp
else
    RM_IMAGES = docker images -q jacksonbarreto/* | xargs -r docker rmi
    RM_DIR = rm -rf db_data db_data_automation db_data_idp
endif


remove-images:
	@$(RM_IMAGES)

clean-db:
	@$(RM_DIR)

clean: clean-db remove-images