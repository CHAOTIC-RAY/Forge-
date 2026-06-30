#!/usr/bin/env python3
"""
Hugging Face Repo Bootstrap Script for LiteRT Models
Mirrors community weights to the Forge repo and uploads model manifest
"""

import os
import sys
import argparse
import json
from pathlib import Path
from typing import List, Tuple
import requests
from huggingface_hub import HfApi, Repository, login
from tqdm import tqdm

def load_config(config_path: str) -> dict:
    """Load training configuration from YAML file"""
    try:
        import yaml
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    except ImportError:
        print("Error: PyYAML is required. Install with: pip install pyyaml")
        sys.exit(1)

def collect_file_pairs(cfg: dict, manifest: dict, gpu_only: bool = False) -> List[Tuple[str, str]]:
    """
    Collect file pairs from community repo to mirror to the Forge repo
    Returns list of (community_file, forge_file) tuples
    """
    pairs = []
    
    community_repo = cfg['litert']['community_repo']
    chef_repo = cfg['litert']['hf_repo']
    
    # Collect NPU variants
    if 'npu_variants' in cfg['litert']:
        for soc_model, variant in cfg['litert']['npu_variants'].items():
            if gpu_only and variant['backend'] != 'gpu':
                continue
            community_file = f"{cfg['litert']['model_id']}-{soc_model}.litertlm"
            chef_file = variant['file']
            pairs.append((community_file, chef_file))
    
    # Collect GPU variants
    if 'gpu_variants' in cfg['litert']:
        for variant_name, variant in cfg['litert']['gpu_variants'].items():
            if gpu_only and variant['backend'] != 'gpu':
                continue
            community_file = f"{cfg['litert']['model_id']}-{variant_name}.litertlm"
            chef_file = variant['file']
            pairs.append((community_file, chef_file))
    
    # Collect CPU variants
    if 'cpu_variants' in cfg['litert']:
        for variant_name, variant in cfg['litert']['cpu_variants'].items():
            if gpu_only:
                continue
            community_file = f"{cfg['litert']['model_id']}-{variant_name}.litertlm"
            chef_file = variant['file']
            pairs.append((community_file, chef_file))
    
    # Collect Web variants
    if 'web_variants' in cfg['litert']:
        for variant_name, variant in cfg['litert']['web_variants'].items():
            if gpu_only:
                continue
            community_file = f"{cfg['litert']['model_id']}-{variant_name}.litertlm"
            chef_file = variant['file']
            pairs.append((community_file, chef_file))
    
    return pairs

def download_community_file(community_repo: str, community_file: str, dest: Path, token: str = None):
    """Download a file from community Hugging Face repo"""
    api = HfApi(token=token)
    url = f"https://huggingface.co/{community_repo}/resolve/main/{community_file}"
    
    print(f"Downloading {community_file} from {community_repo}...")
    
    response = requests.get(url, stream=True, headers={"Authorization": f"Bearer {token}" if token else None})
    response.raise_for_status()
    
    total_size = int(response.headers.get('content-length', 0))
    dest_path = dest / community_file
    
    with open(dest_path, 'wb') as f:
        with tqdm(total=total_size, unit='B', unit_scale=True, desc=community_file) as pbar:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    pbar.update(len(chunk))
    
    print(f"Downloaded {community_file} to {dest_path}")

def upload_to_chef_repo(chef_repo: str, staging_dir: Path, token: str):
    """Upload files to the Forge Hugging Face repo"""
    api = HfApi(token=token)
    
    print(f"Uploading files to {chef_repo}...")
    
    # Create repo if it doesn't exist
    try:
        repo_info = api.repo_info(chef_repo)
        print(f"Repo {chef_repo} already exists")
    except Exception:
        print(f"Creating repo {chef_repo}...")
        api.create_repo(chef_repo, repo_type="model", private=False)
    
    # Upload folder
    api.upload_folder(
        folder_path=str(staging_dir),
        repo_id=chef_repo,
        repo_type="model",
        commit_message="Bootstrap LiteRT models from community repo"
    )
    
    print(f"Successfully uploaded to {chef_repo}")

def generate_manifest(cfg: dict, output_path: Path):
    """Generate model manifest file"""
    manifest = {
        "version": cfg['manifest']['version'],
        "models": cfg['manifest']['models']
    }
    
    # Add additional model entries from configuration
    for model_cfg in cfg['manifest']['models']:
        if 'litert_variants' not in model_cfg and 'litert_variants' in cfg['litert']:
            model_cfg['litert_variants'] = {}
            
            # Add NPU variants
            if 'npu_variants' in cfg['litert']:
                for soc_model, variant in cfg['litert']['npu_variants'].items():
                    model_cfg['litert_variants'][soc_model] = {
                        "file": variant['file'],
                        "backend": variant['backend'],
                        "aot_backend": variant.get('aot_backend'),
                        "aot_soc_model": variant.get('aot_soc_model')
                    }
            
            # Add GPU variants
            if 'gpu_variants' in cfg['litert']:
                for variant_name, variant in cfg['litert']['gpu_variants'].items():
                    model_cfg['litert_variants'][f"gpu_{variant_name}"] = {
                        "file": variant['file'],
                        "backend": variant['backend']
                    }
            
            # Add CPU variants
            if 'cpu_variants' in cfg['litert']:
                for variant_name, variant in cfg['litert']['cpu_variants'].items():
                    model_cfg['litert_variants'][f"cpu_{variant_name}"] = {
                        "file": variant['file'],
                        "backend": variant['backend']
                    }
    
    with open(output_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"Generated manifest at {output_path}")

def main():
    parser = argparse.ArgumentParser(description="Bootstrap LiteRT models from community repo")
    parser.add_argument("--config", required=True, help="Path to training config YAML file")
    parser.add_argument("--token", help="Hugging Face authentication token")
    parser.add_argument("--gpu-only", action="store_true", help="Only download GPU variants")
    parser.add_argument("--dry-run", action="store_true", help="Download but don't upload")
    parser.add_argument("--staging-dir", default="./staging", help="Staging directory for downloads")
    
    args = parser.parse_args()
    
    # Load configuration
    cfg = load_config(args.config)
    
    # Setup directories
    staging_dir = Path(args.staging_dir)
    staging_dir.mkdir(parents=True, exist_ok=True)
    
    # Login to Hugging Face
    if args.token:
        login(args.token)
    
    # Collect file pairs
    pairs = collect_file_pairs(cfg, None, args.gpu_only)
    print(f"Found {len(pairs)} files to mirror")
    
    # Download files
    community_repo = cfg['litert']['community_repo']
    for community_file, chef_file in pairs:
        try:
            download_community_file(community_repo, community_file, staging_dir, args.token)
            
            # Rename file to chef naming convention
            src = staging_dir / community_file
            dst = staging_dir / chef_file
            if src.exists() and src != dst:
                src.rename(dst)
                print(f"Renamed {community_file} to {chef_file}")
        except Exception as e:
            print(f"Failed to download {community_file}: {e}")
            continue
    
    # Upload to Forge repo
    if not args.dry_run and args.token:
        chef_repo = cfg['litert']['hf_repo']
        upload_to_chef_repo(chef_repo, staging_dir, args.token)
    
    # Generate manifest
    manifest_path = Path(cfg['manifest']['output_path'])
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    generate_manifest(cfg, manifest_path)
    
    print("Bootstrap completed successfully!")

if __name__ == "__main__":
    main()
