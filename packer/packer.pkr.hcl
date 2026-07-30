packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.8"
      source  = "github.com/hashicorp/amazon"
    }
    ansible = {
      version = ">= 1.1.1"
      source  = "github.com/hashicorp/ansible"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.small"
}

variable "ami_name" {
  type    = string
  default = "sunotal-frontend-ami-{{timestamp}}"
}

source "amazon-ebs" "ubuntu" {
  ami_name      = var.ami_name
  instance_type = var.instance_type
  region        = var.aws_region

  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
      architecture        = "x86_64"
    }
    most_recent = true
    owners      = ["099720109477"]
  }

  ssh_username = "ubuntu"

  tags = {
    Name        = "sunotal-frontend-ami"
    Project     = "sunotal"
    ManagedBy   = "packer"
    Environment = "production"
  }
}

build {
  sources = ["source.amazon-ebs.ubuntu"]

  provisioner "shell" {
    inline = [
      "echo 'Waiting for cloud-init completion...'",
      "sudo cloud-init status --wait || true",
      "sudo systemctl stop apt-daily.service apt-daily-upgrade.service || true",
      "sudo systemctl disable apt-daily.timer apt-daily-upgrade.timer || true",
      "sudo killall -9 apt-get apt || true",
      "sudo rm -f /var/lib/apt/lists/lock /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock",
      "sudo rm -rf /var/lib/apt/lists/*",
      "sudo apt-get clean",
      "sudo apt-get update -y",
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y software-properties-common ca-certificates curl git gnupg lsb-release",
      "sudo apt-add-repository -y ppa:ansible/ansible",
      "sudo apt-get update -y",
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ansible"
    ]
  }



  provisioner "ansible-local" {
    playbook_file = "ansible/site.yml"
    extra_arguments = [
      "--extra-vars",
      "workspace=~/sunotal"
    ]
  }

  provisioner "shell" {
    inline = [
      "sudo cloud-init clean",
      "sudo rm -rf /var/lib/cloud/instances",
      "sudo rm -f /home/ubuntu/.ssh/authorized_keys"
    ]
  }

  post-processor "manifest" {
    output     = "packer-manifest.json"
    strip_path = true
  }
}
