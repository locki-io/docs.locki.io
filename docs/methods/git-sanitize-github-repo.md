# Install

```
pip3 install --user git-filter-repo
```

# Remove files from history

```
git filter-repo --invert-paths --path bad/file1.txt --path bad/file2.env --force
```

# Force push

```
git push origin --force --all
git push origin --force --tags
```

# Aftermath for others

```
git fetch && git reset --hard origin/main
```
